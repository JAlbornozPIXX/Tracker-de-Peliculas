import { formatMinutes, formatRating, monthName } from '../format';

describe('formatMinutes', () => {
  it('muestra horas y minutos', () => {
    expect(formatMinutes(125)).toBe('2 h 5 min');
    expect(formatMinutes(21334)).toBe('355 h 34 min');
  });

  it('sin horas muestra solo los minutos', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(0)).toBe('0 min');
  });

  it('con horas exactas omite los minutos', () => {
    expect(formatMinutes(120)).toBe('2 h');
  });
});

describe('monthName', () => {
  it('va de 1 = enero a 12 = diciembre', () => {
    expect(monthName(1)).toBe('Enero');
    expect(monthName(7)).toBe('Julio');
    expect(monthName(12)).toBe('Diciembre');
  });
});

describe('formatRating', () => {
  it('usa coma decimal', () => {
    expect(formatRating(4.75)).toBe('4,75');
    expect(formatRating(5)).toBe('5');
  });
});
