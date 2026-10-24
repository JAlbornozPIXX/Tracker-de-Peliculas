import { isRetryableStatus, PendingWrite, UserMovieFields } from '@/modules/sync/utils/pending-writes';

// Basta con lo que usa la cola; PostgrestError lo cumple.
export type RemoteError = { message: string; code: string };
export type RemoteResult = { status: number; error: RemoteError | null };

// Operaciones contra Supabase que necesita la cola. Se reciben como parámetro
// para poder probar la sincronización sin red.
export type SyncRemote = {
  /**
   * true si hay una sesión válida de userId. Sin ella las peticiones salen como
   * anónimas y RLS responde 0 filas, que applyWrite tomaría como "el servidor
   * tiene algo más nuevo" y descartaría el pendiente.
   */
  hasSession(userId: string): Promise<boolean>;
  /** Aplica los campos solo si updated_at en el servidor es <= changedAt. */
  updateUserMovieIfOlder(
    userId: string,
    movieId: number,
    fields: UserMovieFields,
    changedAt: string
  ): Promise<RemoteResult & { applied: boolean }>;
  userMovieExists(userId: string, movieId: number): Promise<RemoteResult & { exists: boolean }>;
  insertUserMovie(userId: string, movieId: number, fields: UserMovieFields, changedAt: string): Promise<RemoteResult>;
  addReaction(userId: string, movieId: number, reactionId: number): Promise<RemoteResult>;
  removeReaction(userId: string, movieId: number, reactionId: number): Promise<RemoteResult>;
};

/**
 * saved: el servidor tiene el cambio. superseded: el servidor ya tenía un
 * cambio más nuevo y ese gana. retry: sin red o sin sesión, queda pendiente.
 * rejected: el servidor lo rechazó y reintentar no cambiaría nada.
 */
export type ApplyOutcome =
  | { type: 'saved' }
  | { type: 'superseded' }
  | { type: 'retry' }
  | { type: 'rejected'; error: RemoteError };

const UNIQUE_VIOLATION = '23505';

function failure(result: RemoteResult): ApplyOutcome {
  return isRetryableStatus(result.status) ? { type: 'retry' } : { type: 'rejected', error: result.error! };
}

export async function applyWrite(userId: string, write: PendingWrite, remote: SyncRemote): Promise<ApplyOutcome> {
  if (write.kind === 'reaction') {
    const result = write.selected
      ? await remote.addReaction(userId, write.movieId, write.reactionId)
      : await remote.removeReaction(userId, write.movieId, write.reactionId);
    // Ya estaba marcado: el reintento de una escritura que sí había llegado.
    if (!result.error || result.error.code === UNIQUE_VIOLATION) return { type: 'saved' };
    return failure(result);
  }

  // Dos vueltas: si otra escritura crea la fila entre el update y el insert,
  // la segunda vuelta la actualiza.
  for (let attempt = 0; attempt < 2; attempt++) {
    const update = await remote.updateUserMovieIfOlder(userId, write.movieId, write.fields, write.changedAt);
    if (update.error) return failure(update);
    if (update.applied) return { type: 'saved' };

    const existing = await remote.userMovieExists(userId, write.movieId);
    if (existing.error) return failure(existing);
    // La fila existe pero no se actualizó: su updated_at es más reciente.
    if (existing.exists) return { type: 'superseded' };
    // Sin fila no hay dónde guardar nota o estrellas (status es obligatorio).
    if (write.fields.status === undefined) return { type: 'superseded' };

    const insert = await remote.insertUserMovie(userId, write.movieId, write.fields, write.changedAt);
    if (!insert.error) return { type: 'saved' };
    if (insert.error.code !== UNIQUE_VIOLATION) return failure(insert);
  }
  return { type: 'retry' };
}
