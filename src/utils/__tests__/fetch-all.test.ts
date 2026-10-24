import { chunk, fetchAllRows, fetchByIdChunks } from '../fetch-all';

// Una consulta falsa sobre `total` filas que devuelve como máximo maxRows por petición.
function fakeQuery(total: number, { maxRows = 1000, withCount = true } = {}) {
  const rows = Array.from({ length: total }, (_, i) => ({ id: i + 1 }));
  const ranges: [number, number][] = [];
  const page = async (from: number, to: number) => {
    ranges.push([from, to]);
    const data = rows.slice(from, Math.min(to + 1, from + maxRows));
    return { data, error: null, count: withCount ? total : null };
  };
  return { page, ranges };
}

describe('fetchAllRows', () => {
  it('con menos de una página hace una sola petición', async () => {
    const { page, ranges } = fakeQuery(40);
    await expect(fetchAllRows(page)).resolves.toHaveLength(40);
    expect(ranges).toEqual([[0, 999]]);
  });

  it('pide páginas hasta llegar al total', async () => {
    const { page, ranges } = fakeQuery(2500);
    const rows = await fetchAllRows<{ id: number }>(page);
    expect(rows).toHaveLength(2500);
    expect(rows.at(-1)).toEqual({ id: 2500 });
    expect(ranges).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it('no se corta si el servidor devuelve menos filas por página (max_rows menor)', async () => {
    const { page, ranges } = fakeQuery(1200, { maxRows: 500 });
    await expect(fetchAllRows(page)).resolves.toHaveLength(1200);
    expect(ranges.map(([from]) => from)).toEqual([0, 500, 1000]);
  });

  it('sin total, sigue hasta una página vacía', async () => {
    const { page, ranges } = fakeQuery(1500, { withCount: false });
    await expect(fetchAllRows(page)).resolves.toHaveLength(1500);
    expect(ranges.map(([from]) => from)).toEqual([0, 1000, 1500]);
  });

  it('propaga el error de Supabase', async () => {
    const error = { message: 'JWT expired' };
    await expect(fetchAllRows(async () => ({ data: null, error, count: null }))).rejects.toEqual(error);
  });
});

describe('ids en lotes', () => {
  it('parte los ids en lotes de 200', () => {
    const ids = Array.from({ length: 450 }, (_, i) => i);
    expect(chunk(ids).map((part) => part.length)).toEqual([200, 200, 50]);
    expect(chunk([])).toEqual([]);
  });

  it('junta los resultados de cada lote', async () => {
    const ids = Array.from({ length: 450 }, (_, i) => i);
    const fetch = jest.fn(async (part: number[]) => part.map((id) => id * 2));
    const results = await fetchByIdChunks(ids, fetch);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(results).toHaveLength(450);
    expect(results[449]).toBe(898);
  });
});
