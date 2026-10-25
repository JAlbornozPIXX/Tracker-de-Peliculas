import { TMDB_MAX_RESULTS } from '../random-pages';
import {
  describeFilters,
  EMPTY_ROULETTE_FILTERS,
  loosenFilters,
  pickRandom,
  poolSizeLabel,
  toDiscoverFilters,
} from '../roulette';

const candidates = Array.from({ length: 12 }, (_, index) => ({ id: index + 1 }));
const COMEDY = { id: 35, name: 'Comedia' };

// Generador determinista para que la prueba no dependa de Math.random.
function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2 ** 31;
    return state / 2 ** 31;
  };
}

const seenIn = (seen: Set<number>) => (candidate: { id: number }) => seen.has(candidate.id);

describe('pickRandom', () => {
  it('10 giros seguidos no repiten mientras queden candidatas', () => {
    for (const seed of [1, 7, 42, 2026]) {
      const random = seededRandom(seed);
      const seen = new Set<number>();
      for (let spin = 0; spin < 10; spin++) {
        const picked = pickRandom(candidates, seenIn(seen), random);
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
      const picked = pickRandom(candidates, seenIn(seen), () => 0);
      expect(seen.has(picked!.id)).toBe(false);
      seen.add(picked!.id);
    }
  });

  it('devuelve la última candidata pendiente y después null', () => {
    const seen = new Set(candidates.slice(1).map((c) => c.id));
    expect(pickRandom(candidates, seenIn(seen), () => 0.99)).toEqual({ id: 1 });
    seen.add(1);
    expect(pickRandom(candidates, seenIn(seen))).toBeNull();
  });

  it('sin candidatas devuelve null', () => {
    expect(pickRandom([], () => false)).toBeNull();
  });

  it('no se sale del arreglo si random devuelve 1', () => {
    expect(pickRandom(candidates, () => false, () => 1)).toEqual({ id: 12 });
  });
});

describe('loosenFilters', () => {
  it('quita primero la duración y después el género', () => {
    const first = loosenFilters({ genre: COMEDY, maxDurationMinutes: 100 });
    expect(first).toEqual({ genre: COMEDY, maxDurationMinutes: null });
    expect(loosenFilters(first!)).toEqual(EMPTY_ROULETTE_FILTERS);
  });

  it('sin restricciones devuelve null', () => {
    expect(loosenFilters(EMPTY_ROULETTE_FILTERS)).toBeNull();
  });
});

describe('filtros de la ruleta', () => {
  it('se traducen a la consulta de TheMovieDB', () => {
    expect(toDiscoverFilters({ genre: COMEDY, maxDurationMinutes: 90 })).toEqual({
      genreIds: [35],
      maxDurationMinutes: 90,
    });
    expect(toDiscoverFilters(EMPTY_ROULETTE_FILTERS)).toEqual({ genreIds: [], maxDurationMinutes: null });
  });

  it('se describen para los avisos', () => {
    expect(describeFilters({ genre: COMEDY, maxDurationMinutes: 90 })).toBe('Comedia · hasta 90 min');
    expect(describeFilters(EMPTY_ROULETTE_FILTERS)).toBe('Cualquier género · sin límite de duración');
  });
});

describe('sorteo simple', () => {
  it('desde una playlist de 3 películas solo devuelve esas 3', () => {
    const playlist = [{ id: 21 }, { id: 22 }, { id: 23 }];
    for (const seed of [1, 7, 42]) {
      const random = seededRandom(seed);
      const seen = new Set<number>();
      for (let draw = 0; draw < 3; draw++) {
        const picked = pickRandom(playlist, seenIn(seen), random);
        expect([21, 22, 23]).toContain(picked!.id);
        seen.add(picked!.id);
      }
      expect(pickRandom(playlist, seenIn(seen), random)).toBeNull();
    }
  });

  it('cuenta cuántas películas de TheMovieDB entran en el sorteo', () => {
    expect(poolSizeLabel(1)).toBe('1 película');
    expect(poolSizeLabel(1234)).toBe('1.234 películas');
    expect(poolSizeLabel(TMDB_MAX_RESULTS + 1)).toBe('Más de 10.000 películas');
  });
});
