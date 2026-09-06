const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w342';

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
};

type TmdbMultiSearchResponse = {
  results: TmdbMultiSearchItem[];
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
 * Busca películas y series en TheMovieDB por texto libre.
 * Devuelve un arreglo vacío si la consulta está vacía.
 */
export async function searchMovies(query: string, signal?: AbortSignal): Promise<MovieResult[]> {
  if (!TMDB_API_KEY) {
    throw new TmdbConfigError(
      'Falta configurar EXPO_PUBLIC_TMDB_API_KEY para poder buscar en TheMovieDB.'
    );
  }

  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const params = new URLSearchParams({
    api_key: TMDB_API_KEY,
    query: trimmedQuery,
    include_adult: 'false',
    language: 'es-ES',
    page: '1',
  });

  const response = await fetch(`${TMDB_BASE_URL}/search/multi?${params.toString()}`, { signal });

  if (!response.ok) {
    throw new Error(`TheMovieDB respondió con un error (${response.status}).`);
  }

  const data = (await response.json()) as TmdbMultiSearchResponse;

  return data.results.filter(isMovieOrTv).map((item) => ({
    id: item.id,
    mediaType: item.media_type,
    title: item.title ?? item.name ?? 'Sin título',
    year: extractYear(item.media_type === 'movie' ? item.release_date : item.first_air_date),
    posterUrl: getPosterUrl(item.poster_path),
  }));
}
