import type { RouletteFilters } from '@/modules/movies/api/movies';

export const EMPTY_ROULETTE_FILTERS: RouletteFilters = { genre: null, maxDurationMinutes: null };

/**
 * Sortea una candidata que todavía no salió en la sesión. Devuelve null si
 * ya salieron todas. random se inyecta para poder probarla.
 */
export function pickRandom<T extends { id: number }>(
  candidates: readonly T[],
  seenIds: ReadonlySet<number>,
  random: () => number = Math.random
): T | null {
  const pending = candidates.filter((candidate) => !seenIds.has(candidate.id));
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

// Sorteo simple: "Comedia + Romance" exige los dos géneros a la vez.
export function filterByGenres<T extends { genre: string[] }>(movies: readonly T[], genres: readonly string[]): T[] {
  return movies.filter((movie) => genres.every((genre) => movie.genre.includes(genre)));
}

// Géneros presentes en las películas, ordenados, para los chips del sorteo.
export function genresOf(movies: readonly { genre: string[] }[]): string[] {
  return Array.from(new Set(movies.flatMap((movie) => movie.genre))).sort((a, b) => a.localeCompare(b));
}

export function describeFilters(filters: RouletteFilters): string {
  const duration =
    filters.maxDurationMinutes != null ? `hasta ${filters.maxDurationMinutes} min` : 'sin límite de duración';
  return `${filters.genre ?? 'Cualquier género'} · ${duration}`;
}
