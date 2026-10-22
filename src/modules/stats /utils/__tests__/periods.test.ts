import { monthPeriod, yearPeriod } from '../period';

describe('monthPeriod', () => {
  it('va del primer al último día del mes', () => {
    expect(monthPeriod(2026, 10)).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(monthPeriod(2026, 4)).toEqual({ from: '2026-04-01', to: '2026-04-30' });
  });

  it('respeta los años bisiestos', () => {
    expect(monthPeriod(2026, 2).to).toBe('2026-02-28');
    expect(monthPeriod(2024, 2).to).toBe('2024-02-29');
  });

  it('diciembre termina el 31 del mismo año', () => {
    expect(monthPeriod(2026, 12)).toEqual({ from: '2026-12-01', to: '2026-12-31' });
  });
});

describe('yearPeriod', () => {
  it('cubre el año completo', () => {
    expect(yearPeriod(2026)).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });
});
