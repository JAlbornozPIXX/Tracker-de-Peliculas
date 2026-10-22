import {
  busiestMonth,
  minutesWatched,
  topAndBottomRated,
  viewsPerDay,
  viewsPerMonth,
} from '../stats';
import { monthPeriod } from '@/modules/stats/utils/period';
import { supabase } from '@/utils/supabase';

jest.mock('@/utils/supabase', () => ({ supabase: { from: jest.fn() } }));

const USER = 'user-1';

type Row = {
  movie_id: number;
  viewed_on: string;
  movies: { title: string; poster_url: string | null; duration_minutes: number | null; user_movies: { rating: string | null }[] };
};

function row(movieId: number, viewedOn: string, durationMinutes: number | null, rating: string | null): Row {
  return {
    movie_id: movieId,
    viewed_on: viewedOn,
    movies: { title: `Película ${movieId}`, poster_url: null, duration_minutes: durationMinutes, user_movies: rating == null ? [] : [{ rating }] },
  };
}

function fakeViews(rows: Row[], error: object | null = null) {
  const calls: { method: string; args: unknown[] }[] = [];
  const range = { from: '', to: '' };
  const builder = {
    select: (...args: unknown[]) => record('select', args),
    eq: (...args: unknown[]) => record('eq', args),
    order: (...args: unknown[]) => record('order', args),
    gte: (column: string, value: string) => {
      range.from = value;
      return record('gte', [column, value]);
    },
    lte: (column: string, value: string) => {
      range.to = value;
      return record('lte', [column, value]);
    },
    range: async (start: number, end: number) => {
      calls.push({ method: 'range', args: [start, end] });
      if (error) return { data: null, error };
      const inPeriod = rows.filter((r) => r.viewed_on >= range.from && r.viewed_on <= range.to);
      return { data: inPeriod.slice(start, end + 1), error: null };
    },
  };
  function record(method: string, args: unknown[]) {
    calls.push({ method, args });
    return builder;
  }
  jest.mocked(supabase.from).mockReturnValue(builder as never);
  return calls;
}

const ROWS = [
  row(1, '2025-12-31', 100, '5.00'),
  row(1, '2026-01-05', 100, '4.50'),
  row(2, '2026-01-05', 45, '1.25'),
  row(3, '2026-01-20', null, null),
  row(2, '2026-03-02', 45, '1.25'),
  row(4, '2026-03-02', 90, '3.00'),
  row(4, '2026-03-15', 90, '3.00'),
];

describe('consulta', () => {
  it('lee movie_views del usuario unido a movies y user_movies, dentro del período', async () => {
    const calls = fakeViews(ROWS);
    await viewsPerDay(USER, monthPeriod(2026, 1));

    expect(supabase.from).toHaveBeenCalledWith('movie_views');
    const select = calls.find((call) => call.method === 'select')?.args[0] as string;
    expect(select).toContain('movies(');
    expect(select).toContain('user_movies(rating)');
    expect(calls).toContainEqual({ method: 'eq', args: ['user_id', USER] });
    expect(calls).toContainEqual({ method: 'eq', args: ['movies.user_movies.user_id', USER] });
    expect(calls).toContainEqual({ method: 'gte', args: ['viewed_on', '2026-01-01'] });
    expect(calls).toContainEqual({ method: 'lte', args: ['viewed_on', '2026-01-31'] });
  });

  it('pide páginas hasta traer todas las vistas', async () => {
    const many = Array.from({ length: 2500 }, (_, i) => row(i, '2026-05-01', 1, null));
    const calls = fakeViews(many);
    await expect(minutesWatched(USER, monthPeriod(2026, 5))).resolves.toBe(2500);
    expect(calls.filter((call) => call.method === 'range').map((call) => call.args)).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it('propaga el error de Supabase', async () => {
    fakeViews(ROWS, { message: 'JWT expired' });
    await expect(viewsPerMonth(USER, 2026)).rejects.toEqual({ message: 'JWT expired' });
  });
});

describe('viewsPerDay', () => {
  it('cuenta las vistas de cada día del período', async () => {
    fakeViews(ROWS);
    await expect(viewsPerDay(USER, monthPeriod(2026, 3))).resolves.toEqual([
      { date: '2026-03-02', views: 2 },
      { date: '2026-03-15', views: 1 },
    ]);
  });

  it('un período sin datos devuelve una lista vacía', async () => {
    fakeViews(ROWS);
    await expect(viewsPerDay(USER, monthPeriod(2026, 11))).resolves.toEqual([]);
  });
});

describe('viewsPerMonth', () => {
  it('cuenta solo las vistas del año pedido', async () => {
    fakeViews(ROWS);
    await expect(viewsPerMonth(USER, 2026)).resolves.toEqual([
      { month: 1, views: 3 },
      { month: 3, views: 3 },
    ]);
  });

  it('un año sin datos devuelve una lista vacía', async () => {
    fakeViews(ROWS);
    await expect(viewsPerMonth(USER, 2024)).resolves.toEqual([]);
  });
});

describe('minutesWatched', () => {
  it('suma duration_minutes por vista; sin duración suma 0', async () => {
    fakeViews(ROWS);
    await expect(minutesWatched(USER, monthPeriod(2026, 1))).resolves.toBe(145);
  });

  it('un período sin datos son 0 minutos', async () => {
    fakeViews(ROWS);
    await expect(minutesWatched(USER, monthPeriod(2026, 11))).resolves.toBe(0);
  });
});

describe('topAndBottomRated', () => {
  it('elige la mejor y la peor del año y convierte la nota a número', async () => {
    fakeViews(ROWS);
    const { top, bottom } = await topAndBottomRated(USER, 2026);
    expect(top).toEqual({ movieId: 1, title: 'Película 1', posterUrl: null, rating: 4.5, lastViewedOn: '2026-01-05' });
    expect(bottom).toMatchObject({ movieId: 2, rating: 1.25, lastViewedOn: '2026-03-02' });
  });

  it('un año sin datos devuelve null en ambas', async () => {
    fakeViews(ROWS);
    await expect(topAndBottomRated(USER, 2024)).resolves.toEqual({ top: null, bottom: null });
  });
});

describe('busiestMonth', () => {
  it('en empate de vistas gana el mes más temprano', async () => {
    fakeViews(ROWS);
    await expect(busiestMonth(USER, 2026)).resolves.toEqual({ month: 1, views: 3 });
  });

  it('un año sin datos devuelve null', async () => {
    fakeViews(ROWS);
    await expect(busiestMonth(USER, 2024)).resolves.toBeNull();
  });
});
