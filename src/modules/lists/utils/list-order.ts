import type { ListMovie } from '@/modules/lists/api/lists';
import { isOrderedKind, ListKind } from '@/modules/lists/constants/kinds';

type Sortable = Pick<ListMovie, 'position' | 'added_at'>;

/**
 * Playlists y colecciones siguen el orden manual (position); el resto, lo
 * agregado más recientemente primero.
 */
export function sortListMovies<T extends Sortable>(kind: ListKind, movies: T[]): T[] {
  if (isOrderedKind(kind)) {
    return [...movies].sort(
      (a, b) =>
        (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) ||
        a.added_at.localeCompare(b.added_at)
    );
  }
  return [...movies].sort((a, b) => b.added_at.localeCompare(a.added_at));
}

/**
 * Mueve la película de from a to y numera la lista de 1 en adelante.
 * changes solo trae las filas cuya posición cambió, para escribir lo mínimo.
 */
export function moveListMovie<T extends { id: number; position: number | null }>(
  movies: T[],
  from: number,
  to: number
): { movies: T[]; changes: { movieId: number; position: number }[] } {
  if (from === to || to < 0 || to >= movies.length) return { movies, changes: [] };

  const moved = [...movies];
  const [item] = moved.splice(from, 1);
  moved.splice(to, 0, item);

  const changes: { movieId: number; position: number }[] = [];
  const renumbered = moved.map((movie, index) => {
    const position = index + 1;
    if (movie.position === position) return movie;
    changes.push({ movieId: movie.id, position });
    return { ...movie, position };
  });
  return { movies: renumbered, changes };
}
