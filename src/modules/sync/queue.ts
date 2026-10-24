import AsyncStorage from '@react-native-async-storage/async-storage';

import type { UserMovieFields, UserMovieRow } from '@/modules/movies/api/user-movies';
import { supabaseRemote } from '@/modules/sync/api/remote';
import { applyPendingToReactions, applyPendingToUserMovie } from '@/modules/sync/utils/pending-writes';
import { createSyncQueue } from '@/modules/sync/utils/sync-queue';

export const syncQueue = createSyncQueue({ storage: AsyncStorage, remote: supabaseRemote });

export function saveUserMovie(userId: string, movieId: number, fields: UserMovieFields) {
  return syncQueue.save(userId, { kind: 'user_movie', movieId, fields, changedAt: new Date().toISOString() });
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
