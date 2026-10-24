import type { StatusKey } from '@/modules/movies/constants/status';
import { supabase } from '@/utils/supabase';

export type UserMovieRow = {
  status: StatusKey;
  rating: number | null;
  notes: string | null;
};

export async function getUserMovie(userId: string, movieId: number): Promise<UserMovieRow | null> {
  const { data, error } = await supabase
    .from('user_movies')
    .select('status, rating, notes')
    .eq('user_id', userId)
    .eq('movie_id', movieId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export type UserMovieFields = {
  status?: StatusKey;
  rating?: number | null;
  notes?: string | null;
};

// Las escrituras pasan por la cola de src/modules/sync: así un cambio sin red
// queda guardado en el teléfono y se sube después.

/**
 * Aplica los campos solo si el servidor no tiene un cambio más reciente que
 * changedAt (gana el más reciente según updated_at). applied es false si la
 * fila no existe o si su updated_at es posterior.
 */
export async function updateUserMovieIfOlder(
  userId: string,
  movieId: number,
  fields: UserMovieFields,
  changedAt: string
) {
  const { data, error, status } = await supabase
    .from('user_movies')
    .update({ ...fields, updated_at: changedAt })
    .eq('user_id', userId)
    .eq('movie_id', movieId)
    .lte('updated_at', changedAt)
    .select('movie_id');
  return { error, status, applied: (data?.length ?? 0) > 0 };
}

export async function userMovieExists(userId: string, movieId: number) {
  const { data, error, status } = await supabase
    .from('user_movies')
    .select('movie_id')
    .eq('user_id', userId)
    .eq('movie_id', movieId)
    .maybeSingle();
  return { error, status, exists: data != null };
}

// La única escritura que crea la fila: necesita status, que es NOT NULL sin
// default. Por eso estrellas o nota nunca son la primera escritura.
export async function insertUserMovie(userId: string, movieId: number, fields: UserMovieFields, changedAt: string) {
  const { error, status } = await supabase
    .from('user_movies')
    .insert({ user_id: userId, movie_id: movieId, ...fields, updated_at: changedAt });
  return { error, status };
}

export async function getDisqualifiedMovieIds(userId: string): Promise<number[]> {
  const { data, error } = await supabase
    .from('user_movies')
    .select('movie_id')
    .eq('user_id', userId)
    .in('status', ['watched', 'abandoned']);

  if (error) throw error;
  return (data ?? []).map((row) => row.movie_id);
}

// Ids de las películas Terminadas; con movieIds se limita a esas películas.
export async function getWatchedMovieIds(userId: string, movieIds?: number[]): Promise<Set<number>> {
  if (movieIds?.length === 0) return new Set();

  let query = supabase.from('user_movies').select('movie_id').eq('user_id', userId).eq('status', 'watched');
  if (movieIds) query = query.in('movie_id', movieIds);

  const { data, error } = await query;
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.movie_id));
}
