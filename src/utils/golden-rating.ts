// Solo la nota máxima lleva marco dorado; 4,75 ya no cuenta.
export const GOLDEN_RATING = 5;

export function isGoldenRating(rating: number | null | undefined): boolean {
  return rating != null && Number(rating) >= GOLDEN_RATING;
}
