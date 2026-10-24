import { isDeckDone, putBack, takeTop } from '../deck';
import { isInShamePile } from '../shame';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('baraja del repaso', () => {
  it('borrar y deshacer deja la tarjeta arriba, en el mismo orden', () => {
    const cards = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const afterDelete = takeTop(cards);
    expect(afterDelete.map((c) => c.id)).toEqual([2, 3]);
    expect(putBack(afterDelete, cards[0])).toEqual(cards);
  });

  it('termina solo cuando no quedan tarjetas ni un deshacer pendiente', () => {
    expect(isDeckDone([{ id: 1 }], false)).toBe(false);
    expect(isDeckDone([], true)).toBe(false);
    expect(isDeckDone([], false)).toBe(true);
  });
});

describe('mantener', () => {
  it('saca la película de la pila por 180 días más', () => {
    const keptAt = new Date('2026-10-22T12:00:00Z');
    const row = { status: 'watchlist' as const, statusChangedAt: keptAt.toISOString() };
    expect(isInShamePile(row, keptAt)).toBe(false);
    expect(isInShamePile(row, new Date(keptAt.getTime() + 179 * DAY_MS))).toBe(false);
    expect(isInShamePile(row, new Date(keptAt.getTime() + 180 * DAY_MS))).toBe(true);
  });
});
