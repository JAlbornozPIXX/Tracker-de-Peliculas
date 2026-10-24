import type {
  ChangedAtByField,
  UserMovieField,
  UserMovieFields,
  UserMovieRow,
} from '@/modules/movies/api/user-movies';

export type { ChangedAtByField, UserMovieField, UserMovieFields };

/**
 * Escritura guardada en el teléfono hasta que el servidor la confirme.
 * changedAt es el momento del cambio en el teléfono: se compara con la hora
 * del mismo dato en el servidor y gana el más reciente. En user_movies,
 * fieldChangedAt guarda la hora de cada campo cuando se combinan cambios
 * hechos en momentos distintos.
 */
export type PendingWrite =
  | { kind: 'user_movie'; movieId: number; fields: UserMovieFields; changedAt: string; fieldChangedAt?: ChangedAtByField }
  | { kind: 'reaction'; movieId: number; reactionId: number; selected: boolean; changedAt: string };

type UserMovieWrite = Extract<PendingWrite, { kind: 'user_movie' }>;

export function writeKey(write: PendingWrite): string {
  return write.kind === 'user_movie' ? `user_movie:${write.movieId}` : `reaction:${write.movieId}:${write.reactionId}`;
}

// Hora de cada campo pendiente. Las escrituras guardadas antes de que
// existiera fieldChangedAt usan changedAt para todos.
export function changedAtByField(write: UserMovieWrite): ChangedAtByField {
  const times: ChangedAtByField = {};
  for (const field of Object.keys(write.fields) as UserMovieField[]) {
    times[field] = write.fieldChangedAt?.[field] ?? write.changedAt;
  }
  return times;
}

/**
 * Agrega una escritura a la cola. Si ya había una pendiente para lo mismo, se
 * combinan: en user_movies se juntan los campos (el más nuevo pisa) y cada uno
 * conserva su hora, y en un calificador basta el último estado.
 */
export function mergeWrite(queue: PendingWrite[], next: PendingWrite): PendingWrite[] {
  const key = writeKey(next);
  const existing = queue.find((write) => writeKey(write) === key);
  if (!existing) return [...queue, next];

  const merged =
    existing.kind === 'user_movie' && next.kind === 'user_movie'
      ? {
          ...next,
          fields: { ...existing.fields, ...next.fields },
          // Un cambio viejo no se vuelve "más reciente" por juntarse con uno nuevo.
          fieldChangedAt: { ...changedAtByField(existing), ...changedAtByField(next) },
        }
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

// Columna o tabla que la base todavía no tiene: falta volver a ejecutar
// supabase/schema.sql. El cambio espera en el teléfono en vez de perderse.
const SCHEMA_OUTDATED_CODES = new Set(['PGRST204', 'PGRST205', '42703', '42P01']);

export function isRetryableError(status: number, code?: string): boolean {
  return isRetryableStatus(status) || (code != null && SCHEMA_OUTDATED_CODES.has(code));
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
