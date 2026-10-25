import type { MovieDetails, MovieResultType } from '@/modules/movies/api/tmdb';
import { fetchAllRows, fetchByIdChunks } from '@/utils/fetch-all';
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

// Géneros de TheMovieDB de las películas del catálogo propio (RN-03): la
// tabla movies es compartida y tiene también las de otros usuarios.
export async function getDistinctGenres(userId: string): Promise<string[]> {
  const rows = await fetchByIdChunks([...(await getCatalogMovieIds(userId))], async (ids) => {
    const { data, error } = await supabase.from('movies').select('genre').in('id', ids);
    if (error) throw error;
    return (data ?? []) as { genre: string[] | null }[];
  });

  const genres = new Set<string>();
  for (const row of rows) {
    for (const g of row.genre ?? []) genres.add(g);
  }
  return Array.from(genres).sort();
}

export async function getMoviesByIds(movieIds: number[]): Promise<MovieRow[]> {
  return fetchByIdChunks(movieIds, async (ids) => {
    const { data, error } = await supabase.from('movies').select(MOVIE_COLUMNS).in('id', ids);
    if (error) throw error;
    return (data ?? []) as MovieRow[];
  });
}

// Ids de TheMovieDB de las que son películas de ahí; las series y las del seed
// (sin tmdb_id) quedan fuera.
export async function getTmdbMovieIds(movieIds: number[]): Promise<number[]> {
  const rows = await fetchByIdChunks(movieIds, async (ids) => {
    const { data, error } = await supabase.from('movies').select('tmdb_id').in('id', ids).eq('media_type', 'movie');
    if (error) throw error;
    return (data ?? []) as { tmdb_id: number }[];
  });
  return rows.map((row) => row.tmdb_id);
}

// RN-03: el catálogo del usuario son las películas con seguimiento
// (user_movies) más las que están en alguna de sus listas.
async function getCatalogMovieIds(userId: string): Promise<Set<number>> {
  const [tracked, listed] = await Promise.all([
    fetchAllRows<{ movie_id: number }>((from, to) =>
      supabase
        .from('user_movies')
        .select('movie_id', { count: 'exact' })
        .eq('user_id', userId)
        .order('movie_id')
        .range(from, to)
    ),
    fetchAllRows<{ movie_id: number }>((from, to) =>
      supabase
        .from('list_movies')
        .select('movie_id, lists!inner(user_id)', { count: 'exact' })
        .eq('lists.user_id', userId)
        .order('list_id')
        .order('movie_id')
        .range(from, to)
    ),
  ]);
  return new Set([...tracked, ...listed].map((row) => row.movie_id));
}

// El catálogo propio por título; la tabla movies es compartida por todos.
export async function getCatalogMovies(userId: string): Promise<MovieRow[]> {
  const movies = await getMoviesByIds([...(await getCatalogMovieIds(userId))]);
  return movies.sort((a, b) => a.title.localeCompare(b.title));
}
