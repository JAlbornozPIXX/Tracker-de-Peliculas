import type { ViewRecord } from '@/modules/stats/utils/metrics';
import { isWrappedReady, summarizeYear } from '../summary';

function view(movieId: number, viewedOn: string, extra: Partial<ViewRecord> = {}): ViewRecord {
  return { movieId, viewedOn, title: `Película ${movieId}`, posterUrl: null, durationMinutes: 100, rating: null, ...extra };
}

describe('summarizeYear', () => {
  it('reúne los 4 datos de la tarjeta', () => {
    const records = [
      view(1, '2026-03-01', { rating: 5 }),
      view(1, '2026-07-02', { rating: 5 }),
      view(2, '2026-07-10', { rating: 1.5, durationMinutes: 45 }),
      view(3, '2026-07-20', { durationMinutes: null }),
      view(4, '2026-09-01', { rating: 3 }),
    ];
    expect(summarizeYear(2026, records)).toEqual({
      year: 2026,
      views: 5,
      titles: 4,
      minutes: 345,
      busiestMonth: { month: 7, views: 3 },
      top: expect.objectContaining({ movieId: 1, rating: 5 }),
      bottom: expect.objectContaining({ movieId: 2, rating: 1.5 }),
    });
  });

  it('un año sin vistas da ceros y null', () => {
    expect(summarizeYear(2026, [])).toEqual({
      year: 2026,
      views: 0,
      titles: 0,
      minutes: 0,
      busiestMonth: null,
      top: null,
      bottom: null,
    });
  });
});

describe('isWrappedReady', () => {
  const records = (count: number) => Array.from({ length: count }, (_, i) => view(i, '2026-01-01'));

  it('con 2 vistas muestra el mensaje en lugar de la tarjeta', () => {
    expect(isWrappedReady(summarizeYear(2026, records(2)))).toBe(false);
  });

  it('desde 5 vistas hay tarjeta', () => {
    expect(isWrappedReady(summarizeYear(2026, records(4)))).toBe(false);
    expect(isWrappedReady(summarizeYear(2026, records(5)))).toBe(true);
  });
});
