import { getListWithMovies } from '@/modules/lists/api/lists';
import {
  getAllMovies,
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

// Sorteo simple por géneros: películas del catálogo con todos los géneros.
// A diferencia de la ruleta, no se limita a las películas con seguimiento.
export async function getGenreDrawCandidates(genres: string[]): Promise<MovieRow[]> {
  return filterByGenres(await getAllMovies(), genres);
}
