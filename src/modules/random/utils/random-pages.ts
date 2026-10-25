// TheMovieDB entrega como máximo 500 páginas de 20 resultados por consulta.
export const TMDB_PAGE_SIZE = 20;
export const TMDB_MAX_PAGES = 500;
export const TMDB_MAX_RESULTS = TMDB_PAGE_SIZE * TMDB_MAX_PAGES;

// Páginas nuevas que puede pedir un solo sorteo antes de rendirse. Casi todas
// las películas de una página sirven: normalmente alcanza con una.
const MAX_PAGE_FETCHES_PER_PICK = 8;

export type RandomPage<T> = { results: T[]; totalResults: number };

export type RandomPagePick<T> = { kind: 'picked'; item: T } | { kind: 'empty' } | { kind: 'exhausted' };

/**
 * Sorteo uniforme y sin repetir sobre una consulta paginada: elige al azar
 * una posición entre todos los resultados que todavía no salieron y pide
 * solo la página que la contiene (cada página, una sola vez). Una posición
 * que skip descarta (ya vista, excluida) tampoco vuelve a salir. random se
 * inyecta para poder probarlo.
 */
export function createRandomPagePicker<T>(
  fetchPage: (page: number) => Promise<RandomPage<T>>,
  random: () => number = Math.random
) {
  const pages = new Map<number, T[]>();
  // Posiciones (0 es la primera de la página 1) que todavía no salieron; null
  // hasta conocer el total con la primera página.
  let remaining: number[] | null = null;
  let total = 0;

  async function loadPage(page: number): Promise<T[]> {
    const cached = pages.get(page);
    if (cached) return cached;
    const { results, totalResults } = await fetchPage(page);
    pages.set(page, results);
    if (remaining === null) {
      total = Math.min(totalResults, TMDB_MAX_RESULTS);
      remaining = Array.from({ length: total }, (_, position) => position);
    }
    return results;
  }

  async function pendingPositions(): Promise<number[]> {
    if (remaining === null) await loadPage(1);
    return remaining ?? [];
  }

  return {
    async next(skip: (item: T) => boolean): Promise<RandomPagePick<T>> {
      const pool = await pendingPositions();
      if (total === 0) return { kind: 'empty' };

      let fetches = 0;
      while (pool.length > 0) {
        const at = Math.min(Math.floor(random() * pool.length), pool.length - 1);
        const position = pool[at];
        const page = Math.floor(position / TMDB_PAGE_SIZE) + 1;
        if (!pages.has(page)) {
          if (fetches === MAX_PAGE_FETCHES_PER_PICK) throw new Error('No encontramos una película nueva. Intenta de nuevo.');
          fetches += 1;
        }
        // Se saca antes de esperar la página, así dos sorteos no eligen la misma.
        pool[at] = pool[pool.length - 1];
        pool.pop();

        let results: T[];
        try {
          results = await loadPage(page);
        } catch (err) {
          // Si la página no llegó, la posición sigue disponible para el próximo intento.
          pool.push(position);
          throw err;
        }
        const item = results[position % TMDB_PAGE_SIZE];
        if (item !== undefined && !skip(item)) return { kind: 'picked', item };
      }
      return { kind: 'exhausted' };
    },
  };
}
