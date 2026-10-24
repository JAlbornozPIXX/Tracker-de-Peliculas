// PostgREST devuelve como máximo max_rows filas por petición (1000 en Supabase).
const PAGE_SIZE = 1000;
// Ids por petición en un filtro .in(): con muchos, la URL se vuelve demasiado larga.
const IN_CHUNK_SIZE = 200;
// PostgREST responde 416 si la página empieza después de la última fila: pasa
// si se borraron filas entre una página y la siguiente.
const RANGE_NOT_SATISFIABLE = 'PGRST103';

type Page = { data: unknown[] | null; error: unknown; count?: number | null };

/**
 * Lee todas las filas de una consulta, página por página. page(from, to) arma
 * la consulta con count: 'exact' y un orden estable (sin orden, dos páginas
 * pueden repetir o saltarse filas) y termina en .range(from, to). Se detiene
 * al llegar al total, o con una página vacía si no hay total: así no se corta
 * aunque max_rows sea menor que PAGE_SIZE.
 */
export async function fetchAllRows<T>(page: (from: number, to: number) => PromiseLike<Page>): Promise<T[]> {
  const rows: T[] = [];
  for (;;) {
    const { data, error, count } = await page(rows.length, rows.length + PAGE_SIZE - 1);
    if (error) {
      if ((error as { code?: string }).code === RANGE_NOT_SATISFIABLE) return rows;
      throw error;
    }
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length === 0 || (count != null && rows.length >= count)) return rows;
  }
}

export function chunk<T>(items: T[], size = IN_CHUNK_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let start = 0; start < items.length; start += size) chunks.push(items.slice(start, start + size));
  return chunks;
}

/** Aplica fetch a cada lote de ids (en paralelo) y junta los resultados. */
export async function fetchByIdChunks<T>(ids: number[], fetch: (chunkIds: number[]) => Promise<T[]>): Promise<T[]> {
  const results = await Promise.all(chunk(ids).map(fetch));
  return results.flat();
}
