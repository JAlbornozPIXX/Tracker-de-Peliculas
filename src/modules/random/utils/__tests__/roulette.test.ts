import { EMPTY_ROULETTE_FILTERS, filterByGenres, genresOf, loosenFilters, pickRandom } from '../roulette';

const candidates = Array.from({ length: 12 }, (_, index) => ({ id: index + 1 }));

// Generador determinista para que la prueba no dependa de Math.random.
function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2 ** 31;
    return state / 2 ** 31;
  };
}

describe('pickRandom', () => {
  it('10 giros seguidos no repiten mientras queden candidatas', () => {
    for (const seed of [1, 7, 42, 2026]) {
      const random = seededRandom(seed);
      const seen = new Set<number>();
      for (let spin = 0; spin < 10; spin++) {
        const picked = pickRandom(candidates, seen, random);
        expect(picked).not.toBeNull();
        expect(seen.has(picked!.id)).toBe(false);
        seen.add(picked!.id);
      }
      expect(seen.size).toBe(10);
    }
  });

  it('con un random que siempre da lo mismo tampoco repite', () => {
    const seen = new Set<number>();
    for (let spin = 0; spin < 10; spin++) {
      const picked = pickRandom(candidates, seen, () => 0);
      expect(seen.has(picked!.id)).toBe(false);
      seen.add(picked!.id);
    }
  });

  it('devuelve la última candidata pendiente y después null', () => {
    const seen = new Set(candidates.slice(1).map((c) => c.id));
    expect(pickRandom(candidates, seen, () => 0.99)).toEqual({ id: 1 });
    seen.add(1);
    expect(pickRandom(candidates, seen)).toBeNull();
  });

  it('sin candidatas devuelve null', () => {
    expect(pickRandom([], new Set())).toBeNull();
  });

  it('no se sale del arreglo si random devuelve 1', () => {
    expect(pickRandom(candidates, new Set(), () => 1)).toEqual({ id: 12 });
  });
});

describe('loosenFilters', () => {
  it('quita primero la duración y después el género', () => {
    const first = loosenFilters({ genre: 'Comedia', maxDurationMinutes: 100 });
    expect(first).toEqual({ genre: 'Comedia', maxDurationMinutes: null });
    expect(loosenFilters(first!)).toEqual(EMPTY_ROULETTE_FILTERS);
  });

  it('sin restricciones devuelve null', () => {
    expect(loosenFilters(EMPTY_ROULETTE_FILTERS)).toBeNull();
  });
});

describe('sorteo simple', () => {
  it('desde una playlist de 3 películas solo devuelve esas 3', () => {
    const playlist = [{ id: 21 }, { id: 22 }, { id: 23 }];
    for (const seed of [1, 7, 42]) {
      const random = seededRandom(seed);
      const seen = new Set<number>();
      for (let draw = 0; draw < 3; draw++) {
        const picked = pickRandom(playlist, seen, random);
        expect([21, 22, 23]).toContain(picked!.id);
        seen.add(picked!.id);
      }
      expect(pickRandom(playlist, seen, random)).toBeNull();
    }
  });

  it('comedia + romance devuelve solo películas con ambos géneros', () => {
    const movies = [
      { id: 1, genre: ['Comedia'] },
      { id: 2, genre: ['Romance'] },
      { id: 3, genre: ['Comedia', 'Romance'] },
      { id: 4, genre: ['Drama', 'Romance', 'Comedia'] },
      { id: 5, genre: [] },
    ];
    expect(filterByGenres(movies, ['Comedia', 'Romance']).map((m) => m.id)).toEqual([3, 4]);
    expect(filterByGenres(movies, ['Comedia']).map((m) => m.id)).toEqual([1, 3, 4]);
    // El orden en que se eligen los géneros no cambia el resultado.
    expect(filterByGenres(movies, ['Romance', 'Comedia']).map((m) => m.id)).toEqual([3, 4]);
  });

  it('los chips de género salen solo del catálogo, sin repetir y ordenados', () => {
    expect(genresOf([{ genre: ['Romance', 'Comedia'] }, { genre: ['Comedia', 'Animación'] }, { genre: [] }])).toEqual([
      'Animación',
      'Comedia',
      'Romance',
    ]);
  });
});
