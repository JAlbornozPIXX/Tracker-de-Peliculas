import { supabase } from '@/utils/supabase';

export type MovieRow = {
  id: number;
  title: string;
  overview: string | null;
  poster_url: string | null;
  release_date: string | null;
  genre: string[];
  duration_minutes: number | null;
};

const MOVIE_COLUMNS = 'id, title, overview, poster_url, release_date, genre, duration_minutes';

export async function getMovieById(movieId: number): Promise<MovieRow | null> {
  const { data, error } = await supabase
    .from('movies')
    .select(MOVIE_COLUMNS)
    .eq('id', movieId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getDistinctGenres(): Promise<string[]> {
  const { data, error } = await supabase.from('movies').select('genre');
  if (error) throw error;

  const genres = new Set<string>();
  for (const row of data ?? []) {
    for (const g of row.genre ?? []) genres.add(g);
  }
  return Array.from(genres).sort();
}

export type RouletteFilters = {
  genre: string | null;
  maxDurationMinutes: number | null;
};

export async function getEligibleMovies(
  excludedMovieIds: number[],
  filters: RouletteFilters
): Promise<MovieRow[]> {
  let query = supabase.from('movies').select(MOVIE_COLUMNS);

  if (filters.genre) {
    query = query.contains('genre', [filters.genre]);
  }

  if (filters.maxDurationMinutes != null) {
    query = query.lte('duration_minutes', filters.maxDurationMinutes);
  }

  if (excludedMovieIds.length > 0) {
    query = query.not('id', 'in', `(${excludedMovieIds.join(',')})`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
