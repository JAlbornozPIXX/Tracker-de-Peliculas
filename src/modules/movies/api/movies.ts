import type { MovieDetails, MovieResultType } from '@/modules/movies/api/tmdb';
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

export async function findMovieIdByTmdb(tmdbId: number, mediaType: MovieResultType): Promise<number | null> {
  const { data, error } = await supabase
    .from('movies')
    .select('id')
    .eq('tmdb_id', tmdbId)
    .eq('media_type', mediaType)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}

/**
 * Devuelve el id interno de un título de TheMovieDB, creando la fila en
 * movies si todavía no existe.
 */
export async function ensureMovieFromTmdb(details: MovieDetails): Promise<number> {
  const existingId = await findMovieIdByTmdb(details.id, details.mediaType);
  if (existingId != null) return existingId;

  const { data, error } = await supabase
    .from('movies')
    .insert({
      tmdb_id: details.id,
      media_type: details.mediaType,
      title: details.title,
      overview: details.overview,
      poster_url: details.posterUrl,
      genre: details.genres,
      release_date: details.releaseDate,
      duration_minutes: details.durationMinutes,
    })
    .select('id')
    .single();

  if (error) {
    // Otra sesión pudo crear la misma fila entre la consulta y el insert.
    const racedId = await findMovieIdByTmdb(details.id, details.mediaType);
    if (racedId != null) return racedId;
    throw error;
  }
  return data.id;
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
