import type { UserMovieFields, UserMovieRow } from '@/modules/movies/api/user-movies';
import type { RemoteResult, SyncRemote } from '@/modules/sync/utils/apply-write';
import type { SyncStorage } from '@/modules/sync/utils/sync-queue';

type ServerRow = UserMovieRow & { updatedAt: string };

const OFFLINE = { status: 0, error: { message: 'TypeError: Network request failed', details: '', hint: '', code: '' } };
const OK = { status: 200, error: null };

/** Supabase en memoria con un interruptor de "modo avión" y otro de sesión. */
export function createFakeServer() {
  const rows = new Map<number, ServerRow>();
  const reactions = new Set<string>();
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
    async updateUserMovieIfOlder(_userId, movieId, fields: UserMovieFields, changedAt) {
      const down = offline({ applied: false });
      if (down) return down;
      const row = rows.get(movieId);
      if (!row || row.updatedAt > changedAt) return { ...OK, applied: false };
      rows.set(movieId, { ...row, ...fields, updatedAt: changedAt });
      return { ...OK, applied: true };
    },
    async userMovieExists(_userId, movieId) {
      return offline({ exists: false }) ?? { ...OK, exists: rows.has(movieId) };
    },
    async insertUserMovie(_userId, movieId, fields, changedAt) {
      const down = offline({});
      if (down) return down;
      rows.set(movieId, { status: fields.status!, rating: fields.rating ?? null, notes: fields.notes ?? null, updatedAt: changedAt });
      return OK;
    },
    async addReaction(_userId, movieId, reactionId) {
      const down = offline({});
      if (down) return down;
      reactions.add(`${movieId}:${reactionId}`);
      return OK;
    },
    async removeReaction(_userId, movieId, reactionId) {
      const down = offline({});
      if (down) return down;
      reactions.delete(`${movieId}:${reactionId}`);
      return OK;
    },
  };

  return { remote, rows, reactions, state };
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
