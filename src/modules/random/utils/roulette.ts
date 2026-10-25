import type { DiscoverFilters, Genre } from '@/modules/movies/api/tmdb';
import { TMDB_MAX_RESULTS } from '@/modules/random/utils/random-pages';

export type RouletteFilters = {
  genre: Genre | null;
  maxDurationMinutes: number | null;
};

export const EMPTY_ROULETTE_FILTERS: RouletteFilters = { genre: null, maxDurationMinutes: null };

/**
 * Sortea una candidata que todavía no salió en la sesión. Devuelve null si
 * ya salieron todas. random se inyecta para poder probarla.
 */
export function pickRandom<T>(
  candidates: readonly T[],
  isSeen: (candidate: T) => boolean,
  random: () => number = Math.random
): T | null {
  const pending = candidates.filter((candidate) => !isSeen(candidate));
  if (pending.length === 0) return null;
  return pending[Math.min(Math.floor(random() * pending.length), pending.length - 1)];
}

/**
 * Quita una restricción para "Aflojar restricciones": primero la duración y
 * después el género. null si ya no queda ninguna que quitar.
 */
export function loosenFilters(filters: RouletteFilters): RouletteFilters | null {
  if (filters.maxDurationMinutes != null) return { ...filters, maxDurationMinutes: null };
  if (filters.genre != null) return { ...filters, genre: null };
  return null;
}

export function toDiscoverFilters(filters: RouletteFilters): DiscoverFilters {
  return { genreIds: filters.genre ? [filters.genre.id] : [], maxDurationMinutes: filters.maxDurationMinutes };
}

export function describeFilters(filters: RouletteFilters): string {
  const duration =
    filters.maxDurationMinutes != null ? `hasta ${filters.maxDurationMinutes} min` : 'sin límite de duración';
  return `${filters.genre?.name ?? 'Cualquier género'} · ${duration}`;
}

// Cuántas películas entran en el sorteo: TheMovieDB entrega como máximo las
// primeras 10.000 de cada consulta.
export function poolSizeLabel(total: number): string {
  if (total > TMDB_MAX_RESULTS) return `Más de ${TMDB_MAX_RESULTS.toLocaleString('es-CL')} películas`;
  return total === 1 ? '1 película' : `${total.toLocaleString('es-CL')} películas`;
}
