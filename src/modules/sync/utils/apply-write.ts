import type { UserMovieValue } from '@/modules/movies/api/user-movies';
import {
  ChangedAtByField,
  changedAtByField,
  isRetryableError,
  PendingWrite,
  UserMovieField,
  UserMovieFields,
} from '@/modules/sync/utils/pending-writes';

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
  /** Aplica un campo solo si en el servidor ese campo cambió antes de changedAt. */
  updateUserMovieFieldIfOlder(
    userId: string,
    movieId: number,
    field: UserMovieField,
    value: UserMovieValue,
    changedAt: string
  ): Promise<RemoteResult & { applied: boolean }>;
  userMovieExists(userId: string, movieId: number): Promise<RemoteResult & { exists: boolean }>;
  insertUserMovie(
    userId: string,
    movieId: number,
    fields: UserMovieFields,
    changedAt: ChangedAtByField & { status: string }
  ): Promise<RemoteResult>;
  /** Marca o desmarca solo si en el servidor ese calificador cambió antes de changedAt. */
  updateMovieReactionIfOlder(
    userId: string,
    movieId: number,
    reactionId: number,
    selected: boolean,
    changedAt: string
  ): Promise<RemoteResult & { applied: boolean }>;
  movieReactionExists(userId: string, movieId: number, reactionId: number): Promise<RemoteResult & { exists: boolean }>;
  insertMovieReaction(userId: string, movieId: number, reactionId: number, changedAt: string): Promise<RemoteResult>;
};

/**
 * saved: el servidor tiene el cambio. superseded: el servidor ya tenía un
 * cambio más nuevo de ese dato (o de alguno de los campos) y ese gana.
 * retry: sin red o sin sesión, queda pendiente. rejected: el servidor lo
 * rechazó y reintentar no cambiaría nada.
 */
export type ApplyOutcome =
  | { type: 'saved' }
  | { type: 'superseded' }
  | { type: 'retry' }
  | { type: 'rejected'; error: RemoteError };

const UNIQUE_VIOLATION = '23505';

function failure(result: RemoteResult): ApplyOutcome {
  return isRetryableError(result.status, result.error?.code)
    ? { type: 'retry' }
    : { type: 'rejected', error: result.error! };
}

type UserMovieWrite = Extract<PendingWrite, { kind: 'user_movie' }>;
type ReactionWrite = Extract<PendingWrite, { kind: 'reaction' }>;

async function applyUserMovie(userId: string, write: UserMovieWrite, remote: SyncRemote): Promise<ApplyOutcome> {
  const times = changedAtByField(write);
  // Del cambio más viejo al más nuevo, así updated_at queda con el último.
  const fields = (Object.keys(write.fields) as UserMovieField[])
    .filter((field) => write.fields[field] !== undefined)
    .sort((a, b) => times[a]!.localeCompare(times[b]!));

  // Dos vueltas: si otra escritura crea la fila entre el update y el insert,
  // la segunda vuelta la actualiza.
  for (let attempt = 0; attempt < 2; attempt++) {
    let stale = 0;
    for (const field of fields) {
      const value = write.fields[field] as UserMovieValue;
      const update = await remote.updateUserMovieFieldIfOlder(userId, write.movieId, field, value, times[field]!);
      if (update.error) return failure(update);
      if (!update.applied) stale += 1;
    }
    if (stale === 0) return { type: 'saved' };
    // Algún campo se aplicó: la fila existe y los demás tenían un cambio más nuevo.
    if (stale < fields.length) return { type: 'superseded' };

    const existing = await remote.userMovieExists(userId, write.movieId);
    if (existing.error) return failure(existing);
    // La fila existe pero ningún campo se actualizó: todos son más nuevos en el servidor.
    if (existing.exists) return { type: 'superseded' };
    // Sin fila no hay dónde guardar nota o estrellas (status es obligatorio).
    if (write.fields.status === undefined) return { type: 'superseded' };

    const insert = await remote.insertUserMovie(userId, write.movieId, write.fields, {
      ...times,
      status: times.status!,
    });
    if (!insert.error) return { type: 'saved' };
    if (insert.error.code !== UNIQUE_VIOLATION) return failure(insert);
  }
  return { type: 'retry' };
}

async function applyReaction(userId: string, write: ReactionWrite, remote: SyncRemote): Promise<ApplyOutcome> {
  const { movieId, reactionId, selected, changedAt } = write;
  for (let attempt = 0; attempt < 2; attempt++) {
    const update = await remote.updateMovieReactionIfOlder(userId, movieId, reactionId, selected, changedAt);
    if (update.error) return failure(update);
    if (update.applied) return { type: 'saved' };

    const existing = await remote.movieReactionExists(userId, movieId, reactionId);
    if (existing.error) return failure(existing);
    // Existe pero no se actualizó: en el servidor cambió después.
    if (existing.exists) return { type: 'superseded' };
    // Nunca se marcó: no hay nada que desmarcar.
    if (!selected) return { type: 'saved' };

    const insert = await remote.insertMovieReaction(userId, movieId, reactionId, changedAt);
    if (!insert.error) return { type: 'saved' };
    if (insert.error.code !== UNIQUE_VIOLATION) return failure(insert);
  }
  return { type: 'retry' };
}

export async function applyWrite(userId: string, write: PendingWrite, remote: SyncRemote): Promise<ApplyOutcome> {
  return write.kind === 'reaction' ? applyReaction(userId, write, remote) : applyUserMovie(userId, write, remote);
}
