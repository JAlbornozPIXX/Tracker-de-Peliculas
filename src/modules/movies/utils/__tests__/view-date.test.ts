import { formatViewCount, fromDateString, toLocalDateString } from '../view-date';

describe('toLocalDateString', () => {
  it('usa el día local, no el de UTC', () => {
    expect(toLocalDateString(new Date(2026, 9, 21, 23, 59))).toBe('2026-10-21');
    expect(toLocalDateString(new Date(2026, 9, 21, 0, 0))).toBe('2026-10-21');
  });

  it('rellena mes y día con cero', () => {
    expect(toLocalDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('fromDateString', () => {
  it('es la inversa de toLocalDateString', () => {
    expect(toLocalDateString(fromDateString('2026-03-09'))).toBe('2026-03-09');
    expect(toLocalDateString(fromDateString('2024-02-29'))).toBe('2024-02-29');
  });
});

describe('formatViewCount', () => {
  it('usa singular para una vista', () => {
    expect(formatViewCount(1)).toBe('Vista 1 vez');
  });

  it('usa plural para varias', () => {
    expect(formatViewCount(2)).toBe('Vista 2 veces');
  });
});
