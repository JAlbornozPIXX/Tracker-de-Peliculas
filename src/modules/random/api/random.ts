import { getListWithMovies } from '@/modules/lists/api/lists';
import { getMoviesByIds, getTmdbMovieIds, type MovieRow } from '@/modules/movies/api/movies';
import { discoverMovies, getMovieDetails, type DiscoverFilters, type MovieDetails } from '@/modules/movies/api/tmdb';
import { getDisqualifiedMovieIds } from '@/modules/movies/api/user-movies';
import type { DrawSource, DrawSuggestion } from '@/modules/random/hooks/use-draw';
import { createRandomPagePicker } from '@/modules/random/utils/random-pages';
import { pickRandom } from '@/modules/random/utils/roulette';

const movieKey = (movieId: number) => `movie:${movieId}`;
const tmdbKey = (tmdbId: number) => `tmdb:${tmdbId}`;

function suggestionFromRow(movie: MovieRow): DrawSuggestion {
  return {
    key: movieKey(movie.id),
    title: movie.title,
    overview: movie.overview,
    posterUrl: movie.poster_url,
    year: movie.release_date?.slice(0, 4) ?? null,
    durationMinutes: movie.duration_minutes,
    genres: movie.genre,
    detail: { id: String(movie.id) },
  };
}

function suggestionFromTmdb(details: MovieDetails): DrawSuggestion {
  return {
    key: tmdbKey(details.id),
    title: details.title,
    overview: details.overview,
    posterUrl: details.posterUrl,
    year: details.year,
    durationMinutes: details.durationMinutes,
    genres: details.genres,
    detail: { id: String(details.id), mediaType: 'movie' },
  };
}

// Sorteo simple desde una lista: solo las películas de esa lista.
export async function getListDrawCandidates(listId: number): Promise<MovieRow[]> {
  const list = await getListWithMovies(listId);
  return getMoviesByIds(list?.movies.map((movie) => movie.id) ?? []);
}

export function listDrawSource(listId: number): DrawSource {
  let movies: MovieRow[] | null = null;
  return {
    async next(seen) {
      movies ??= await getListDrawCandidates(listId);
      if (movies.length === 0) return { kind: 'empty' };
      const picked = pickRandom(movies, (movie) => seen.has(movieKey(movie.id)));
      return picked ? { kind: 'picked', suggestion: suggestionFromRow(picked) } : { kind: 'exhausted' };
    },
  };
}

// RN-03: lo que el usuario terminó o abandonó nunca se sugiere.
async function getFinishedTmdbIds(userId: string): Promise<Set<number>> {
  return new Set(await getTmdbMovieIds(await getDisqualifiedMovieIds(userId)));
}

/**
 * Ruleta y sorteo por géneros: al azar entre todas las películas de
 * TheMovieDB que cumplen los filtros, sin las que el usuario terminó o
 * abandonó ni las que no tienen póster.
 */
export function tmdbDrawSource(userId: string, filters: DiscoverFilters): DrawSource {
  const picker = createRandomPagePicker((page) => discoverMovies(filters, page));
  let finished: Set<number> | null = null;
  return {
    async next(seen) {
      const excluded = (finished ??= await getFinishedTmdbIds(userId));
      const pick = await picker.next(
        (movie) => !movie.posterUrl || excluded.has(movie.id) || seen.has(tmdbKey(movie.id))
      );
      if (pick.kind !== 'picked') return pick;
      return { kind: 'picked', suggestion: suggestionFromTmdb(await getMovieDetails(pick.item.id, 'movie')) };
    },
  };
}
