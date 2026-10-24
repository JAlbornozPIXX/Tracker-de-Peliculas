import type { UserMovieField, UserMovieRow } from '@/modules/movies/api/user-movies';
import type { RemoteResult, SyncRemote } from '@/modules/sync/utils/apply-write';
import type { SyncStorage } from '@/modules/sync/utils/sync-queue';

// Como user_movies: cada campo con la hora de su último cambio.
export type ServerRow = UserMovieRow & { changedAt: Record<UserMovieField, string> };
export type ServerReaction = { selected: boolean; changedAt: string };

const OFFLINE = { status: 0, error: { message: 'TypeError: Network request failed', details: '', hint: '', code: '' } };
const OK = { status: 200, error: null };

// Fila del servidor con la misma hora en los tres campos; changedAt permite cambiar la de alguno.
export function serverRow(
  values: UserMovieRow,
  at: string,
  changedAt: Partial<Record<UserMovieField, string>> = {}
): ServerRow {
  return { ...values, changedAt: { status: at, rating: at, notes: at, ...changedAt } };
}

/** Supabase en memoria con un interruptor de "modo avión" y otro de sesión. */
export function createFakeServer() {
  const rows = new Map<number, ServerRow>();
  // Clave `${movieId}:${reactionId}`; desmarcar deja selected = false, como en la base.
  const reactions = new Map<string, ServerReaction>();
  const state = { online: true, signedIn: true, calls: 0 };

  function offline<T extends object>(extra: T): (RemoteResult & T) | null {
    state.calls += 1;
    return state.online ? null : ({ ...OFFLINE, ...extra } as RemoteResult & T);
  }

  const remote: SyncRemote = {
    // Como getSession, no cuenta como petición: lee la sesión guardada.
    async hasSession() {
      return state.signedIn;
    },
    async updateUserMovieFieldIfOlder(_userId, movieId, field, value, changedAt) {
      const down = offline({ applied: false });
      if (down) return down;
      const row = rows.get(movieId);
      if (!row || row.changedAt[field] > changedAt) return { ...OK, applied: false };
      // Como el trigger de schema.sql: la hora del estado solo se mueve si el estado cambia.
      const moved = field !== 'status' || row.status !== value;
      rows.set(movieId, {
        ...row,
        [field]: value,
        changedAt: moved ? { ...row.changedAt, [field]: changedAt } : row.changedAt,
      });
      return { ...OK, applied: true };
    },
    async userMovieExists(_userId, movieId) {
      return offline({ exists: false }) ?? { ...OK, exists: rows.has(movieId) };
    },
    async insertUserMovie(_userId, movieId, fields, changedAt) {
      const down = offline({});
      if (down) return down;
      rows.set(movieId, {
        status: fields.status!,
        rating: fields.rating ?? null,
        notes: fields.notes ?? null,
        changedAt: {
          status: changedAt.status,
          rating: changedAt.rating ?? changedAt.status,
          notes: changedAt.notes ?? changedAt.status,
        },
      });
      return OK;
    },
    async updateMovieReactionIfOlder(_userId, movieId, reactionId, selected, changedAt) {
      const down = offline({ applied: false });
      if (down) return down;
      const key = `${movieId}:${reactionId}`;
      const current = reactions.get(key);
      if (!current || current.changedAt > changedAt) return { ...OK, applied: false };
      reactions.set(key, { selected, changedAt });
      return { ...OK, applied: true };
    },
    async movieReactionExists(_userId, movieId, reactionId) {
      return offline({ exists: false }) ?? { ...OK, exists: reactions.has(`${movieId}:${reactionId}`) };
    },
    async insertMovieReaction(_userId, movieId, reactionId, changedAt) {
      const down = offline({});
      if (down) return down;
      reactions.set(`${movieId}:${reactionId}`, { selected: true, changedAt });
      return OK;
    },
  };

  // Calificadores marcados, para comparar con lo que muestra la ficha.
  const selectedReactions = () =>
    [...reactions].filter(([, reaction]) => reaction.selected).map(([key]) => key);

  return { remote, rows, reactions, selectedReactions, state };
}

/** AsyncStorage en memoria: sobrevive a recrear la cola, como al reabrir la app. */
export function createFakeStorage(): SyncStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    async getItem(key) {
      return data.get(key) ?? null;
    },
    async setItem(key, value) {
      data.set(key, value);
    },
  };
}
