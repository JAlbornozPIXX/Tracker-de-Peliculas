/**
 * Calcula la calificación (en cuartos de estrella) a partir de la estrella
 * presionada y la posición horizontal del toque dentro de ella.
 * Siempre devuelve al menos un cuarto de la estrella tocada (0,25..5,00).
 */
export function ratingFromPress(starIndex: number, locationX: number, starSize: number): number {
  const quarter = Math.min(4, Math.max(1, Math.ceil((locationX / starSize) * 4)));
  const next = starIndex + quarter * 0.25;
  return Math.round(next * 100) / 100;
}
