import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/utils/supabase';
import { withTimeout } from '@/utils/with-timeout';

// La app no llama a TheMovieDB ni guarda su clave: todo pasa por la Edge
// Function tmdb-proxy con la sesión del usuario (ADR-08). El proxy agrega la
// clave y el idioma es-MX.
const TMDB_PROXY_FUNCTION = 'tmdb-proxy';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w342';
const TMDB_POSTER_LARGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// Tiempo máximo de espera de TheMovieDB: si no responde, la búsqueda muestra
// el error con «Reintentar» en vez de quedar cargando (AC-10).
export const TMDB_TIMEOUT_MS = 10_000;

// La ruleta y el sorteo solo sugieren películas con al menos estos votos: con
// menos suelen ser fichas incompletas (sin sinopsis, sin póster).
const DISCOVER_MIN_VOTES = 50;

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

export type DiscoverFilters = {
  genreIds: number[];
  maxDurationMinutes: number | null;
};

export type DiscoverMovie = {
  id: number;
  title: string;
  posterUrl: string | null;
};

export type DiscoverPage = {
  results: DiscoverMovie[];
  totalResults: number;
};

type TmdbDiscoverResponse = {
  results: { id: number; title?: string; poster_path: string | null }[];
  total_results: number;
};

/**
 * Qué salió mal al consultar TheMovieDB a través del proxy. «unavailable»
 * (TheMovieDB caído o sin red) es distinto de una búsqueda sin resultados.
 */
export type TmdbErrorKind = 'unavailable' | 'session' | 'rate_limited' | 'invalid' | 'not_found' | 'misconfigured';

const TMDB_ERROR_MESSAGES: Record<TmdbErrorKind, string> = {
  unavailable: 'No pudimos conectar con TheMovieDB.',
  session: 'Tu sesión venció. Vuelve a iniciar sesión.',
  rate_limited: 'Hiciste muchas consultas seguidas. Intenta en un momento.',
  invalid: 'La búsqueda no es válida.',
  not_found: 'TheMovieDB no tiene ese título.',
  misconfigured: 'El servidor no tiene configurada la conexión con TheMovieDB.',
};

export class TmdbError extends Error {
  constructor(
    readonly kind: TmdbErrorKind,
    message = TMDB_ERROR_MESSAGES[kind]
  ) {
    super(message);
    this.name = 'TmdbError';
    Object.setPrototypeOf(this, TmdbError.prototype);
  }

  // «Reintentar» solo sirve si el problema es pasajero.
  get canRetry(): boolean {
    return this.kind === 'unavailable' || this.kind === 'rate_limited';
  }
}

const KIND_BY_STATUS: Record<number, TmdbErrorKind> = {
  400: 'invalid',
  401: 'session',
  404: 'not_found',
  429: 'rate_limited',
  500: 'misconfigured',
};

// Sin red o con la función caída (FunctionsFetchError/RelayError) es «unavailable».
function toTmdbError(error: unknown): TmdbError {
  const status = error instanceof FunctionsHttpError ? (error.context as Response | undefined)?.status : undefined;
  return new TmdbError((status != null && KIND_BY_STATUS[status]) || 'unavailable');
}

function isSessionError(err: unknown): err is TmdbError {
  return err instanceof TmdbError && err.kind === 'session';
}

async function invokeProxy<T>(path: string, params: Record<string, string>, signal: AbortSignal): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(TMDB_PROXY_FUNCTION, {
    body: { path, params },
    signal,
  });
  if (signal.aborted) {
    throw Object.assign(new Error('La consulta se canceló.'), { name: 'AbortError' });
  }
  if (error) throw toTmdbError(error);
  return data as T;
}

/**
 * GET a TheMovieDB a través de tmdb-proxy, con tiempo máximo. Si la sesión
 * venció se renueva una vez; si sigue sin valer se cierra la sesión local y
 * la app vuelve al login (AC-39).
 */
function tmdbGet<T>(path: string, params: Record<string, string>, signal?: AbortSignal): Promise<T> {
  return withTimeout(
    async (timedSignal) => {
      try {
        return await invokeProxy<T>(path, params, timedSignal);
      } catch (err) {
        if (!isSessionError(err)) throw err;
        const { error } = await supabase.auth.refreshSession();
        try {
          if (error) throw err;
          return await invokeProxy<T>(path, params, timedSignal);
        } catch (retryErr) {
          if (isSessionError(retryErr)) await supabase.auth.signOut({ scope: 'local' });
          throw retryErr;
        }
      }
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

  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return { results: [], totalPages: 0 };
  }

  const params = { query: trimmedQuery, include_adult: 'false', page: String(page) };

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

  const data = await tmdbGet<{ genres: Genre[] }>('/genre/movie/list', {}, signal);
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

  const params = {
    // Separadas por coma, TheMovieDB exige todas las categorías a la vez.
    with_genres: genreIds.join(','),
    sort_by: 'popularity.desc',
    include_adult: 'false',
    page: String(page),
  };

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
 * Una página de las películas de TheMovieDB que cumplen los filtros, de la
 * más popular a la menos. Con varios géneros exige todos a la vez.
 */
export async function discoverMovies(
  filters: DiscoverFilters,
  page: number,
  signal?: AbortSignal
): Promise<DiscoverPage> {

  const params: Record<string, string> = {
    sort_by: 'popularity.desc',
    'vote_count.gte': String(DISCOVER_MIN_VOTES),
    include_adult: 'false',
    include_video: 'false',
    page: String(page),
  };
  if (filters.genreIds.length > 0) {
    // Separadas por coma, TheMovieDB exige todas las categorías a la vez.
    params.with_genres = filters.genreIds.join(',');
  }
  if (filters.maxDurationMinutes != null) {
    // Sin duración cargada TheMovieDB guarda 0: no cumple un tope de minutos.
    params['with_runtime.gte'] = '1';
    params['with_runtime.lte'] = String(filters.maxDurationMinutes);
  }

  const data = await tmdbGet<TmdbDiscoverResponse>('/discover/movie', params, signal);

  return {
    results: data.results.map((item) => ({
      id: item.id,
      title: item.title ?? 'Sin título',
      posterUrl: getPosterUrl(item.poster_path),
    })),
    totalResults: data.total_results,
  };
}

/**
 * Trae el detalle de una película o serie de TheMovieDB.
 */
export async function getMovieDetails(
  id: number,
  mediaType: MovieResultType,
  signal?: AbortSignal
): Promise<MovieDetails> {

  const data = await tmdbGet<TmdbDetailsResponse>(`/${mediaType}/${id}`, {}, signal);
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
