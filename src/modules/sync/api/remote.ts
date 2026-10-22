import { addReactionToMovie, removeReactionFromMovie } from '@/modules/movies/api/reactions';
import { insertUserMovie, updateUserMovieIfOlder, userMovieExists } from '@/modules/movies/api/user-movies';
import type { SyncRemote } from '@/modules/sync/utils/apply-write';

export const supabaseRemote: SyncRemote = {
  updateUserMovieIfOlder,
  userMovieExists,
  insertUserMovie,
  addReaction: async (userId, movieId, reactionId) => addReactionToMovie(userId, movieId, reactionId),
  removeReaction: async (userId, movieId, reactionId) => removeReactionFromMovie(userId, movieId, reactionId),
};
