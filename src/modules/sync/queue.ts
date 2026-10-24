import AsyncStorage from '@react-native-async-storage/async-storage';

import type { UserMovieFields, UserMovieRow } from '@/modules/movies/api/user-movies';
import { supabaseRemote } from '@/modules/sync/api/remote';
import {
  applyPendingToReactions,
  applyPendingToUserMovie,
  applyPendingToWatchedIds,
} from '@/modules/sync/utils/pending-writes';
import { createSyncQueue } from '@/modules/sync/utils/sync-queue';

export const syncQueue = createSyncQueue({ storage: AsyncStorage, remote: supabaseRemote });

export function saveUserMovie(userId: string, movieId: number, fields: UserMovieFields) {
  return syncQueue.save(userId, { kind: 'user_movie', movieId, fields, changedAt: new Date().toISOString() });
}

// viewedOn es el día local del teléfono ('YYYY-MM-DD').
export function saveAutoView(userId: string, movieId: number, viewedOn: string) {
  return syncQueue.save(userId, { kind: 'auto_view', movieId, viewedOn, changedAt: new Date().toISOString() });
}

export function saveMovieReaction(userId: string, movieId: number, reactionId: number, selected: boolean) {
  return syncQueue.save(userId, {
    kind: 'reaction',
    movieId,
    reactionId,
    selected,
    changedAt: new Date().toISOString(),
  });
}

export async function withPendingUserMovie(userId: string, movieId: number, row: UserMovieRow | null) {
  return applyPendingToUserMovie(row, await syncQueue.pendingFor(userId, movieId));
}

export async function withPendingReactions(userId: string, movieId: number, reactionIds: number[]) {
  return applyPendingToReactions(reactionIds, await syncQueue.pendingFor(userId, movieId));
}

export async function withPendingWatchedIds(userId: string, movieIds: number[], watchedIds: Set<number>) {
  const writes = await Promise.all(movieIds.map((movieId) => syncQueue.pendingFor(userId, movieId)));
  return applyPendingToWatchedIds(watchedIds, writes.flat());
}
