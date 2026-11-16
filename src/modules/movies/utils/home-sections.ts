import type { TrackedMovie } from '@/modules/movies/api/user-movies';
import type { StatusKey } from '@/modules/movies/constants/status';

/**
 * Títulos con un estado, del que se puso más recientemente al más antiguo:
 * «Continuar viendo» = Viendo y «Para ver» = Ver más tarde (AC-30). Los que
 * perdieron su película (borrada) no se muestran.
 */
export function moviesWithStatus(tracked: TrackedMovie[], status: StatusKey): TrackedMovie[] {
  return tracked
    .filter((item) => item.status === status && item.movie != null)
    .sort((a, b) => (b.statusChangedAt ?? '').localeCompare(a.statusChangedAt ?? '') || a.movieId - b.movieId);
}

// Nota del usuario por película, para el marco dorado del catálogo.
export function ratingsByMovie(tracked: TrackedMovie[]): Record<number, number | null> {
  return Object.fromEntries(tracked.map((item) => [item.movieId, item.rating]));
}
