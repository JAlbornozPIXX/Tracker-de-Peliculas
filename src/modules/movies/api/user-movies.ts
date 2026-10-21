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

// La única escritura que puede crear una fila nueva — ver nota en MovieDetail
// sobre por qué rating/notes nunca deben ser la primera escritura para un
// (user_id, movie_id) que todavía no existe (status es NOT NULL sin default).
export function setStatus(userId: string, movieId: number, status: StatusKey, rating?: number | null) {
  return supabase
    .from('user_movies')
    .upsert(
      {
        user_id: userId,
        movie_id: movieId,
        status,
        ...(rating !== undefined && { rating }),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,movie_id' }
    );
}

export function updateRating(userId: string, movieId: number, rating: number | null) {
  return supabase
    .from('user_movies')
    .update({ rating, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('movie_id', movieId);
}

export function updateNotes(userId: string, movieId: number, notes: string | null) {
  return supabase
    .from('user_movies')
    .update({ notes, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('movie_id', movieId);
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
