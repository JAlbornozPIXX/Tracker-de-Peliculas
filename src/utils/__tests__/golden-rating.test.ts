import { isGoldenRating } from '../golden-rating';

describe('isGoldenRating', () => {
  it('es dorada con nota 5', () => {
    expect(isGoldenRating(5)).toBe(true);
  });

  it('no es dorada con 4,75 ni sin nota', () => {
    expect(isGoldenRating(4.75)).toBe(false);
    expect(isGoldenRating(0)).toBe(false);
    expect(isGoldenRating(null)).toBe(false);
    expect(isGoldenRating(undefined)).toBe(false);
  });
});
