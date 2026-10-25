import { withTimeout } from '@/utils/with-timeout';

const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_LANGUAGE = 'es-MX';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w342';
const TMDB_POSTER_LARGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// Tiempo máximo de espera de TheMovieDB: si no responde, la búsqueda muestra
// el error con «Reintentar» en vez de quedar cargando (AC-10).
export const TMDB_TIMEOUT_MS = 10_000;

export type MovieResultType = 'movie' | 'tv';

export type MovieResult = {
  id: number;
  mediaType: MovieResultType;
  title: string;
  year: string | null;
  posterUrl: string | null;
};

type TmdbMultiSearchItem = {
  id: number;
  media_type: 'movie' | 'tv' | 'person';
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  genre_ids?: number[];
};

export type Genre = {
  id: number;
  name: string;
};

//Para el detalle de la pelicula
export type MovieDetails = {
  id: number;
  mediaType: MovieResultType;
  title: string;
  overview: string | null;
  posterUrl: string | null;
  year: string | null;
  releaseDate: string | null;
  genres: string[];
  durationMinutes: number | null;
};

type TmdbDetailsResponse = {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  genres: { id: number; name: string }[];
  runtime?: number | null;
  episode_run_time?: number[];
};

type TmdbMultiSearchResponse = {
  results: TmdbMultiSearchItem[];
  total_pages: number;
};

export type MoviePage = {
  results: MovieResult[];
  totalPages: number;
};

/**
 * Error lanzado cuando falta configurar la API key de TheMovieDB.
 */
export class TmdbConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TmdbConfigError';
    Object.setPrototypeOf(this, TmdbConfigError.prototype);
  }
}

// GET a TheMovieDB con tiempo máximo. Un estado HTTP de error lanza su código.
function tmdbGet<T>(path: string, params: URLSearchParams, signal?: AbortSignal): Promise<T> {
  return withTimeout(
    async (timedSignal) => {
      const response = await fetch(`${TMDB_BASE_URL}${path}?${params.toString()}`, { signal: timedSignal });
      if (!response.ok) {
        throw new Error(`TheMovieDB respondió con un error (${response.status}).`);
      }
      return (await response.json()) as T;
    },
    { signal, timeoutMs: TMDB_TIMEOUT_MS }
  );
}

function getPosterUrl(posterPath: string | null): string | null {
  return posterPath ? `${TMDB_IMAGE_BASE_URL}${posterPath}` : null;
}

function extractYear(dateValue?: string): string | null {
  return dateValue && dateValue.length >= 4 ? dateValue.slice(0, 4) : null;
}

function isMovieOrTv(
  item: TmdbMultiSearchItem
): item is TmdbMultiSearchItem & { media_type: 'movie' | 'tv' } {
  return item.media_type === 'movie' || item.media_type === 'tv';
}

/**
 * Busca películas y series en TheMovieDB por texto libre, de a una página.
 * Devuelve una página vacía si la consulta está vacía.
 * Con genreIds, deja solo los resultados que pertenecen a todas esas categorías.
 */
export async function searchMovies(
  query: string,
  signal?: AbortSignal,
  genreIds: number[] = [],
  page = 1
): Promise<MoviePage> {
  if (!TMDB_API_KEY) {
    throw new TmdbConfigError(
      'Falta configurar EXPO_PUBLIC_TMDB_API_KEY para poder buscar en TheMovieDB.'
    );
  }

  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return { results: [], totalPages: 0 };
  }

  const params = new URLSearchParams({
    api_key: TMDB_API_KEY,
    query: trimmedQuery,
    include_adult: 'false',
    language: TMDB_LANGUAGE,
    page: String(page),
  });

  const data = await tmdbGet<TmdbMultiSearchResponse>('/search/multi', params, signal);

  const results = data.results
    .filter(isMovieOrTv)
    .filter((item) => genreIds.every((genreId) => (item.genre_ids ?? []).includes(genreId)))
    .map((item) => ({
      id: item.id,
      mediaType: item.media_type,
      title: item.title ?? item.name ?? 'Sin título',
      year: extractYear(item.media_type === 'movie' ? item.release_date : item.first_air_date),
      posterUrl: getPosterUrl(item.poster_path),
    }));

  return { results, totalPages: data.total_pages };
}

/**
 * Trae las categorías (géneros) de películas de TheMovieDB.
 */
export async function getMovieGenres(signal?: AbortSignal): Promise<Genre[]> {
  if (!TMDB_API_KEY) {
    throw new TmdbConfigError(
      'Falta configurar EXPO_PUBLIC_TMDB_API_KEY para poder consultar TheMovieDB.'
    );
  }

  const params = new URLSearchParams({ api_key: TMDB_API_KEY, language: TMDB_LANGUAGE });
  const data = await tmdbGet<{ genres: Genre[] }>('/genre/movie/list', params, signal);
  return data.genres;
}

/**
 * Trae, de a una página, las películas más populares de TheMovieDB que
 * pertenecen a todas las categorías indicadas.
 */
export async function discoverMoviesByGenres(
  genreIds: number[],
  signal?: AbortSignal,
  page = 1
): Promise<MoviePage> {
  if (!TMDB_API_KEY) {
    throw new TmdbConfigError(
      'Falta configurar EXPO_PUBLIC_TMDB_API_KEY para poder buscar en TheMovieDB.'
    );
  }

  const params = new URLSearchParams({
    api_key: TMDB_API_KEY,
    // Separadas por coma, TheMovieDB exige todas las categorías a la vez.
    with_genres: genreIds.join(','),
    sort_by: 'popularity.desc',
    include_adult: 'false',
    language: TMDB_LANGUAGE,
    page: String(page),
  });

  const data = await tmdbGet<TmdbMultiSearchResponse>('/discover/movie', params, signal);

  const results: MovieResult[] = data.results.map((item) => ({
    id: item.id,
    mediaType: 'movie',
    title: item.title ?? 'Sin título',
    year: extractYear(item.release_date),
    posterUrl: getPosterUrl(item.poster_path),
  }));

  return { results, totalPages: data.total_pages };
}

/**
 * Trae el detalle de una película o serie de TheMovieDB.
 */
export async function getMovieDetails(
  id: number,
  mediaType: MovieResultType,
  signal?: AbortSignal
): Promise<MovieDetails> {
  if (!TMDB_API_KEY) {
    throw new TmdbConfigError(
      'Falta configurar EXPO_PUBLIC_TMDB_API_KEY para poder consultar TheMovieDB.'
    );
  }

  const params = new URLSearchParams({ api_key: TMDB_API_KEY, language: TMDB_LANGUAGE });
  const data = await tmdbGet<TmdbDetailsResponse>(`/${mediaType}/${id}`, params, signal);
  const isMovie = mediaType === 'movie';
  const releaseDate = (isMovie ? data.release_date : data.first_air_date) || null;

  return {
    id: data.id,
    mediaType,
    title: data.title ?? data.name ?? 'Sin título',
    overview: data.overview || null,
    posterUrl: data.poster_path ? `${TMDB_POSTER_LARGE_BASE_URL}${data.poster_path}` : null,
    year: extractYear(releaseDate ?? undefined),
    releaseDate,
    genres: data.genres.map((g) => g.name),
    durationMinutes: (isMovie ? data.runtime : data.episode_run_time?.[0]) ?? null,
  };
}
