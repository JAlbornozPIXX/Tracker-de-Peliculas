import type { UserMovieFields, UserMovieRow } from '@/modules/movies/api/user-movies';

export type { UserMovieFields };

/**
 * Escritura guardada en el teléfono hasta que el servidor la confirme.
 * changedAt es el momento del cambio en el teléfono: se compara con
 * updated_at del servidor para decidir cuál es más reciente.
 */
export type PendingWrite =
  | { kind: 'user_movie'; movieId: number; fields: UserMovieFields; changedAt: string }
  | { kind: 'reaction'; movieId: number; reactionId: number; selected: boolean; changedAt: string };

export function writeKey(write: PendingWrite): string {
  return write.kind === 'user_movie' ? `user_movie:${write.movieId}` : `reaction:${write.movieId}:${write.reactionId}`;
}

/**
 * Agrega una escritura a la cola. Si ya había una pendiente para lo mismo, se
 * combinan: en user_movies se juntan los campos (el más nuevo pisa), y en un
 * calificador basta el último estado.
 */
export function mergeWrite(queue: PendingWrite[], next: PendingWrite): PendingWrite[] {
  const key = writeKey(next);
  const existing = queue.find((write) => writeKey(write) === key);
  if (!existing) return [...queue, next];

  const merged =
    existing.kind === 'user_movie' && next.kind === 'user_movie'
      ? { ...next, fields: { ...existing.fields, ...next.fields } }
      : next;
  return queue.map((write) => (writeKey(write) === key ? merged : write));
}

/**
 * Sin red (status 0), sesión vencida (401), tiempo agotado, límite de
 * peticiones o error del servidor: vale la pena reintentar. Cualquier otro 4xx
 * (RLS, validación, película borrada) fallaría igual la próxima vez.
 */
export function isRetryableStatus(status: number): boolean {
  return status === 0 || status === 401 || status === 408 || status === 429 || status >= 500;
}

// Lo que llega del servidor todavía no incluye los cambios pendientes: se
// superponen para que la ficha muestre lo último que hizo el usuario.
export function applyPendingToUserMovie(row: UserMovieRow | null, writes: PendingWrite[]): UserMovieRow | null {
  const pending = writes.find(
    (write): write is Extract<PendingWrite, { kind: 'user_movie' }> => write.kind === 'user_movie'
  );
  if (!pending) return row;
  if (row) return { ...row, ...pending.fields };
  if (pending.fields.status === undefined) return null;
  return { status: pending.fields.status, rating: pending.fields.rating ?? null, notes: pending.fields.notes ?? null };
}

export function applyPendingToReactions(reactionIds: number[], writes: PendingWrite[]): number[] {
  let next = reactionIds;
  for (const write of writes) {
    if (write.kind !== 'reaction') continue;
    next = next.filter((id) => id !== write.reactionId);
    if (write.selected) next = [...next, write.reactionId];
  }
  return next;
}

// Para las barras de avance: un estado pendiente de subir decide si la
// película cuenta como Terminada, igual que en la ficha.
export function applyPendingToWatchedIds(watchedIds: ReadonlySet<number>, writes: PendingWrite[]): Set<number> {
  const next = new Set(watchedIds);
  for (const write of writes) {
    if (write.kind !== 'user_movie' || write.fields.status === undefined) continue;
    if (write.fields.status === 'watched') next.add(write.movieId);
    else next.delete(write.movieId);
  }
  return next;
}
