export type RankedMovie = {
  id: number;
  title: string;
  posterUrl: string | null;
  releaseYear: number | null;
  genres: string[];
  rating: number;
  // Día ('YYYY-MM-DD') de la vista más reciente, o null si no hay vistas.
  lastViewedOn: string | null;
  listIds: number[];
  reactionIds: number[];
};

// null en un filtro significa "sin filtrar por eso".
export type RankingFilters = {
  minStars: number | null;
  genre: string | null;
  year: number | null;
  listId: number | null;
  reactionId: number | null;
};

export const EMPTY_FILTERS: RankingFilters = { minStars: null, genre: null, year: null, listId: null, reactionId: null };

export function activeFilterCount(filters: RankingFilters): number {
  return Object.values(filters).filter((value) => value != null).length;
}

export function filterRanking(movies: RankedMovie[], filters: RankingFilters): RankedMovie[] {
  return movies.filter(
    (movie) =>
      (filters.minStars == null || movie.rating >= filters.minStars) &&
      (filters.genre == null || movie.genres.includes(filters.genre)) &&
      (filters.year == null || movie.releaseYear === filters.year) &&
      (filters.listId == null || movie.listIds.includes(filters.listId)) &&
      (filters.reactionId == null || movie.reactionIds.includes(filters.reactionId))
  );
}

/**
 * Nota descendente; en empate, la vista más reciente primero (sin vistas al
 * final) y después por título para que el orden sea estable.
 */
export function sortRanking(movies: RankedMovie[]): RankedMovie[] {
  return [...movies].sort(
    (a, b) =>
      b.rating - a.rating ||
      (b.lastViewedOn ?? '').localeCompare(a.lastViewedOn ?? '') ||
      a.title.localeCompare(b.title)
  );
}

// Géneros y años presentes en las películas puntuadas, para los chips de filtro.
export function rankingFacets(movies: RankedMovie[]): { genres: string[]; years: number[] } {
  const genres = new Set<string>();
  const years = new Set<number>();
  for (const movie of movies) {
    movie.genres.forEach((genre) => genres.add(genre));
    if (movie.releaseYear != null) years.add(movie.releaseYear);
  }
  return {
    genres: Array.from(genres).sort((a, b) => a.localeCompare(b)),
    years: Array.from(years).sort((a, b) => b - a),
  };
}

export function formatRating(rating: number): string {
  return `★ ${rating.toLocaleString('es-CL', { maximumFractionDigits: 2 })}`;
}
