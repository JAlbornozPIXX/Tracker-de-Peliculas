import { createRandomPagePicker, RandomPage, TMDB_MAX_PAGES, TMDB_PAGE_SIZE } from '../random-pages';

type Item = { id: number };

// Generador determinista para que la prueba no dependa de Math.random.
function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2 ** 31;
    return state / 2 ** 31;
  };
}

// Una consulta paginada de total resultados (ids 0..total-1), como la de
// TheMovieDB: páginas de 20 y total_results en cada respuesta.
function fakeQuery(total: number, reportedTotal = total) {
  const requested: number[] = [];
  const fetchPage = jest.fn(async (page: number): Promise<RandomPage<Item>> => {
    requested.push(page);
    const start = (page - 1) * TMDB_PAGE_SIZE;
    const results = Array.from({ length: Math.max(0, Math.min(TMDB_PAGE_SIZE, total - start)) }, (_, i) => ({
      id: start + i,
    }));
    return { results, totalResults: reportedTotal };
  });
  return { fetchPage, requested };
}

async function drawAll(picker: ReturnType<typeof createRandomPagePicker<Item>>, skip = (_: Item) => false) {
  const ids: number[] = [];
  for (;;) {
    const pick = await picker.next(skip);
    if (pick.kind !== 'picked') return { ids, last: pick.kind };
    ids.push(pick.item.id);
  }
}

describe('createRandomPagePicker', () => {
  it('saca todas las películas de varias páginas sin repetir y después avisa que salieron todas', async () => {
    const { fetchPage, requested } = fakeQuery(45);
    const { ids, last } = await drawAll(createRandomPagePicker(fetchPage, seededRandom(7)));

    expect(ids).toHaveLength(45);
    expect(new Set(ids).size).toBe(45);
    expect(last).toBe('exhausted');
    // Cada página se pide una sola vez.
    expect([...requested].sort()).toEqual([1, 2, 3]);
  });

  it('sin resultados avisa que no hay coincidencias', async () => {
    const { fetchPage } = fakeQuery(0);
    await expect(createRandomPagePicker(fetchPage).next(() => false)).resolves.toEqual({ kind: 'empty' });
  });

  it('nunca ofrece lo que se descarta (vistas o terminadas) y tampoco lo vuelve a intentar', async () => {
    const { fetchPage } = fakeQuery(40);
    const skip = jest.fn((item: Item) => item.id % 2 === 0);
    const { ids, last } = await drawAll(createRandomPagePicker(fetchPage, seededRandom(42)), skip);

    expect(ids.every((id) => id % 2 === 1)).toBe(true);
    expect(ids).toHaveLength(20);
    expect(last).toBe('exhausted');
    expect(skip).toHaveBeenCalledTimes(40);
  });

  it('respeta el tope de TheMovieDB: nunca pide más allá de la página 500', async () => {
    const { fetchPage, requested } = fakeQuery(50_000);
    // random casi 1 elige la última posición disponible.
    const picker = createRandomPagePicker(fetchPage, () => 0.999999);
    const pick = await picker.next(() => false);

    expect(pick).toEqual({ kind: 'picked', item: { id: TMDB_MAX_PAGES * TMDB_PAGE_SIZE - 1 } });
    expect(Math.max(...requested)).toBe(TMDB_MAX_PAGES);
  });

  it('elige cualquier página con la misma probabilidad', async () => {
    const counts = [0, 0, 0];
    const random = seededRandom(2026);
    for (let run = 0; run < 3000; run++) {
      const { fetchPage } = fakeQuery(60);
      const pick = await createRandomPagePicker(fetchPage, random).next(() => false);
      if (pick.kind === 'picked') counts[Math.floor(pick.item.id / TMDB_PAGE_SIZE)] += 1;
    }
    for (const count of counts) {
      expect(count).toBeGreaterThan(900);
      expect(count).toBeLessThan(1100);
    }
  });

  it('si una página no llega, esa película sigue disponible para el próximo intento', async () => {
    const { fetchPage } = fakeQuery(25);
    const picker = createRandomPagePicker(fetchPage, () => 0.99);
    // Primero carga la página 1; el primer sorteo pide la 2, que falla.
    fetchPage.mockImplementationOnce(async () => ({ results: Array.from({ length: 20 }, (_, id) => ({ id })), totalResults: 25 }));
    fetchPage.mockRejectedValueOnce(new Error('sin red'));

    await expect(picker.next(() => false)).rejects.toThrow('sin red');
    const { ids } = await drawAll(picker);
    expect([...ids].sort((a, b) => a - b)).toEqual(Array.from({ length: 25 }, (_, id) => id));
  });

  it('se rinde con un error si muchas páginas seguidas no tienen nada nuevo', async () => {
    const { fetchPage } = fakeQuery(TMDB_PAGE_SIZE * 50);
    const picker = createRandomPagePicker(fetchPage, seededRandom(3));
    await expect(picker.next(() => true)).rejects.toThrow('No encontramos una película nueva');
  });
});
