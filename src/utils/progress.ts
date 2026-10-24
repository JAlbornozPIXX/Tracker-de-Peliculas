// Fracción completada entre 0 y 1. Sin total (lista vacía) es 0, nunca NaN.
export function progressRatio(done: number, total: number): number {
  if (!(total > 0) || !(done > 0)) return 0;
  return Math.min(1, done / total);
}
