import { ratingFromPress } from '@/modules/movies/utils/star-rating';

const SIZE = 36;

describe('ratingFromPress', () => {
  it('redondea el toque al cuarto de estrella siguiente', () => {
    expect(ratingFromPress(0, 1, SIZE)).toBe(0.25);
    expect(ratingFromPress(0, 9, SIZE)).toBe(0.25);
    expect(ratingFromPress(0, 10, SIZE)).toBe(0.5);
    expect(ratingFromPress(0, 27, SIZE)).toBe(0.75);
    expect(ratingFromPress(0, 28, SIZE)).toBe(1);
  });

  it('suma las estrellas completas anteriores a la tocada', () => {
    expect(ratingFromPress(3, 9, SIZE)).toBe(3.25);
    expect(ratingFromPress(4, 36, SIZE)).toBe(5);
  });

  it('nunca baja de un cuarto ni pasa de una estrella completa', () => {
    expect(ratingFromPress(2, 0, SIZE)).toBe(2.25);
    expect(ratingFromPress(2, -5, SIZE)).toBe(2.25);
    expect(ratingFromPress(4, 80, SIZE)).toBe(5);
  });

  it('solo produce múltiplos exactos de 0,25 (compatibles con numeric(3,2))', () => {
    for (let star = 0; star < 5; star++) {
      for (let x = 0; x <= SIZE; x++) {
        const value = ratingFromPress(star, x, SIZE);
        expect(Number.isInteger(value * 4)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0.25);
        expect(value).toBeLessThanOrEqual(5);
      }
    }
  });
});
