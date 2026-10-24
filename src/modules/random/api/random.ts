import { getListWithMovies } from '@/modules/lists/api/lists';
import {
  getCatalogMovies,
  getEligibleMovies,
  getMoviesByIds,
  type MovieRow,
  type RouletteFilters,
} from '@/modules/movies/api/movies';
import { getDisqualifiedMovieIds } from '@/modules/movies/api/user-movies';
import { filterByGenres } from '@/modules/random/utils/roulette';

// Candidatas de la ruleta: catálogo propio, sin Terminadas ni Abandonadas (RN-03).
export async function getRouletteCandidates(userId: string, filters: RouletteFilters): Promise<MovieRow[]> {
  const disqualified = await getDisqualifiedMovieIds(userId);
  return getEligibleMovies(userId, disqualified, filters);
}

// Sorteo simple desde una lista: solo las películas de esa lista.
export async function getListDrawCandidates(listId: number): Promise<MovieRow[]> {
  const list = await getListWithMovies(listId);
  return getMoviesByIds(list?.movies.map((movie) => movie.id) ?? []);
}

// Sorteo simple por géneros: películas del catálogo propio (RN-03: nunca las
// de otros usuarios) con todos los géneros elegidos.
export async function getGenreDrawCandidates(userId: string, genres: string[]): Promise<MovieRow[]> {
  return filterByGenres(await getCatalogMovies(userId), genres);
}
