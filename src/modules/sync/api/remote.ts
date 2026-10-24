import { insertMovieReaction, movieReactionExists, updateMovieReactionIfOlder } from '@/modules/movies/api/reactions';
import { insertUserMovie, updateUserMovieFieldIfOlder, userMovieExists } from '@/modules/movies/api/user-movies';
import type { SyncRemote } from '@/modules/sync/utils/apply-write';
import { supabase } from '@/utils/supabase';

export const supabaseRemote: SyncRemote = {
  // getSession renueva el token vencido; si no puede, devuelve null.
  hasSession: async (userId) => (await supabase.auth.getSession()).data.session?.user.id === userId,
  updateUserMovieFieldIfOlder,
  userMovieExists,
  insertUserMovie,
  updateMovieReactionIfOlder,
  movieReactionExists,
  insertMovieReaction,
};
