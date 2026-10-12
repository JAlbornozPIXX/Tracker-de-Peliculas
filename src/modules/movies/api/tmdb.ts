const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_LANGUAGE = 'es-MX';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w342';
const TMDB_POSTER_LARGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

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

  const response = await fetch(`${TMDB_BASE_URL}/search/multi?${params.toString()}`, { signal });

  if (!response.ok) {
    throw new Error(`TheMovieDB respondió con un error (${response.status}).`);
  }

  const data = (await response.json()) as TmdbMultiSearchResponse;

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
  const response = await fetch(`${TMDB_BASE_URL}/genre/movie/list?${params.toString()}`, { signal });

  if (!response.ok) {
    throw new Error(`TheMovieDB respondió con un error (${response.status}).`);
  }

  const data = (await response.json()) as { genres: Genre[] };
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

  const response = await fetch(`${TMDB_BASE_URL}/discover/movie?${params.toString()}`, { signal });

  if (!response.ok) {
    throw new Error(`TheMovieDB respondió con un error (${response.status}).`);
  }

  const data = (await response.json()) as TmdbMultiSearchResponse;

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
  const response = await fetch(`${TMDB_BASE_URL}/${mediaType}/${id}?${params.toString()}`, { signal });

  if (!response.ok) {
    throw new Error(`TheMovieDB respondió con un error (${response.status}).`);
  }

  const data = (await response.json()) as TmdbDetailsResponse;
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
