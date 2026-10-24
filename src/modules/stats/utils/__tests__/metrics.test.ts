import {
  countByDay,
  countByMonth,
  pickBusiestMonth,
  pickTopAndBottom,
  sumMinutes,
  type ViewRecord,
} from '../metrics';

function view(movieId: number, viewedOn: string, extra: Partial<ViewRecord> = {}): ViewRecord {
  return {
    movieId,
    viewedOn,
    title: `Película ${movieId}`,
    posterUrl: null,
    durationMinutes: 100,
    genres: [],
    rating: null,
    ...extra,
  };
}

describe('countByDay', () => {
  it('cuenta cada vista, también las repetidas el mismo día, ordenadas por fecha', () => {
    const records = [view(1, '2026-03-02'), view(2, '2026-03-01'), view(1, '2026-03-02'), view(3, '2026-03-02')];
    expect(countByDay(records)).toEqual([
      { date: '2026-03-01', views: 1 },
      { date: '2026-03-02', views: 3 },
    ]);
  });

  it('sin vistas devuelve una lista vacía', () => {
    expect(countByDay([])).toEqual([]);
  });
});

describe('countByMonth', () => {
  it('agrupa por mes de 1 a 12, ordenado', () => {
    const records = [view(1, '2026-12-31'), view(2, '2026-01-01'), view(3, '2026-01-31'), view(1, '2026-07-15')];
    expect(countByMonth(records)).toEqual([
      { month: 1, views: 2 },
      { month: 7, views: 1 },
      { month: 12, views: 1 },
    ]);
  });

  it('sin vistas devuelve una lista vacía', () => {
    expect(countByMonth([])).toEqual([]);
  });
});

describe('sumMinutes', () => {
  it('suma la duración una vez por cada vista', () => {
    expect(sumMinutes([view(1, '2026-01-01', { durationMinutes: 120 }), view(1, '2026-02-01', { durationMinutes: 120 })])).toBe(240);
  });

  it('una serie suma la duración de un episodio por vista', () => {
    expect(sumMinutes([view(1, '2026-01-01', { durationMinutes: 45 }), view(2, '2026-01-01', { durationMinutes: 90 })])).toBe(135);
  });

  it('un título sin duración suma 0 minutos', () => {
    expect(sumMinutes([view(1, '2026-01-01', { durationMinutes: null }), view(2, '2026-01-01', { durationMinutes: 90 })])).toBe(90);
  });

  it('sin vistas son 0 minutos', () => {
    expect(sumMinutes([])).toBe(0);
  });
});

describe('pickTopAndBottom', () => {
  it('elige la mejor y la peor nota entre los títulos vistos', () => {
    const records = [
      view(1, '2026-01-10', { rating: 3.5 }),
      view(2, '2026-02-10', { rating: 5 }),
      view(3, '2026-03-10', { rating: 0.75 }),
    ];
    const { top, bottom } = pickTopAndBottom(records);
    expect(top).toMatchObject({ movieId: 2, rating: 5 });
    expect(bottom).toMatchObject({ movieId: 3, rating: 0.75 });
  });

  it('ignora las vistas sin nota', () => {
    const records = [view(1, '2026-01-10'), view(2, '2026-02-10', { rating: 4 }), view(3, '2026-03-10', { rating: 2 })];
    const { top, bottom } = pickTopAndBottom(records);
    expect(top?.movieId).toBe(2);
    expect(bottom?.movieId).toBe(3);
  });

  it('un título visto varias veces cuenta una vez, con su vista más reciente', () => {
    const records = [view(1, '2026-05-01', { rating: 4 }), view(1, '2026-01-01', { rating: 4 }), view(2, '2026-02-01', { rating: 1 })];
    expect(pickTopAndBottom(records).top).toMatchObject({ movieId: 1, lastViewedOn: '2026-05-01' });
  });

  it('en empate gana la vista más reciente', () => {
    const records = [
      view(1, '2026-01-01', { rating: 5 }),
      view(2, '2026-06-01', { rating: 5 }),
      view(3, '2026-02-01', { rating: 1 }),
      view(4, '2026-08-01', { rating: 1 }),
    ];
    const { top, bottom } = pickTopAndBottom(records);
    expect(top?.movieId).toBe(2);
    expect(bottom?.movieId).toBe(4);
  });

  it('con todas las notas iguales no repite la misma película', () => {
    const { top, bottom } = pickTopAndBottom([view(1, '2026-01-01', { rating: 4 }), view(2, '2026-02-01', { rating: 4 })]);
    expect(top?.movieId).toBe(2);
    expect(bottom?.movieId).toBe(1);
  });

  it('con un solo título puntuado no hay peor', () => {
    expect(pickTopAndBottom([view(1, '2026-01-01', { rating: 4 })])).toEqual({
      top: expect.objectContaining({ movieId: 1 }),
      bottom: null,
    });
  });

  it('sin títulos puntuados ambos son null', () => {
    expect(pickTopAndBottom([])).toEqual({ top: null, bottom: null });
    expect(pickTopAndBottom([view(1, '2026-01-01')])).toEqual({ top: null, bottom: null });
  });
});

describe('pickBusiestMonth', () => {
  it('elige el mes con más vistas', () => {
    const records = [view(1, '2026-02-01'), view(2, '2026-07-01'), view(3, '2026-07-02'), view(4, '2026-09-01')];
    expect(pickBusiestMonth(records)).toEqual({ month: 7, views: 2 });
  });

  it('en empate gana el mes más temprano', () => {
    const records = [view(1, '2026-09-01'), view(2, '2026-09-02'), view(3, '2026-03-01'), view(4, '2026-03-02')];
    expect(pickBusiestMonth(records)).toEqual({ month: 3, views: 2 });
  });

  it('sin vistas es null', () => {
    expect(pickBusiestMonth([])).toBeNull();
  });
});
