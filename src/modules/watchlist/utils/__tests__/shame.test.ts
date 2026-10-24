import { daysSince, isInShamePile, shameCutoff, shamePile } from '../shame';

const NOW = new Date('2026-10-22T12:00:00Z');

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

describe('isInShamePile', () => {
  it('una película de hace 181 días aparece; una de hace 179 no', () => {
    expect(isInShamePile({ status: 'watchlist', statusChangedAt: daysAgo(181) }, NOW)).toBe(true);
    expect(isInShamePile({ status: 'watchlist', statusChangedAt: daysAgo(179) }, NOW)).toBe(false);
  });

  it('a los 180 días justos ya entra', () => {
    expect(isInShamePile({ status: 'watchlist', statusChangedAt: daysAgo(180) }, NOW)).toBe(true);
  });

  it('solo cuenta el estado Ver más tarde', () => {
    expect(isInShamePile({ status: 'paused', statusChangedAt: daysAgo(400) }, NOW)).toBe(false);
  });
});

describe('shamePile', () => {
  it('editar la nota no la saca: se mira status_changed_at, no updated_at', () => {
    const rows = [{ id: 1, status: 'watchlist' as const, statusChangedAt: daysAgo(200), updatedAt: daysAgo(0) }];
    expect(shamePile(rows, NOW).map((row) => row.id)).toEqual([1]);
  });

  it('devuelve los días en espera, de la más antigua a la más nueva', () => {
    const rows = [
      { id: 1, status: 'watchlist' as const, statusChangedAt: daysAgo(190) },
      { id: 2, status: 'watchlist' as const, statusChangedAt: daysAgo(30) },
      { id: 3, status: 'watchlist' as const, statusChangedAt: daysAgo(365) },
    ];
    expect(shamePile(rows, NOW).map((row) => [row.id, row.days])).toEqual([
      [3, 365],
      [1, 190],
    ]);
  });

  it('sin películas viejas la pila queda vacía', () => {
    expect(shamePile([{ status: 'watchlist' as const, statusChangedAt: daysAgo(10) }], NOW)).toEqual([]);
  });
});

describe('daysSince', () => {
  it('cuenta días completos', () => {
    expect(daysSince(daysAgo(1.5), NOW)).toBe(1);
  });
});

describe('shameCutoff', () => {
  it('la consulta deja pasar 181 días y corta 179', () => {
    const cutoff = shameCutoff(NOW).toISOString();
    expect(daysAgo(181) <= cutoff).toBe(true);
    expect(daysAgo(179) <= cutoff).toBe(false);
  });
});
