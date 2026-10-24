import { progressRatio } from '../progress';

describe('progressRatio', () => {
  it('calcula la fracción completada', () => {
    expect(progressRatio(5, 8)).toBe(0.625);
    expect(progressRatio(8, 8)).toBe(1);
  });

  it('es 0 con una lista vacía, sin dividir por cero', () => {
    expect(progressRatio(0, 0)).toBe(0);
  });

  it('no pasa de 1 si se supera la meta', () => {
    expect(progressRatio(7, 5)).toBe(1);
  });

  it('no baja de 0', () => {
    expect(progressRatio(-1, 5)).toBe(0);
  });
});
