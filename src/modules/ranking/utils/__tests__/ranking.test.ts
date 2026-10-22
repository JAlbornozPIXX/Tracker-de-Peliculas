import { EMPTY_FILTERS, filterRanking, rankingFacets, RankedMovie, sortRanking } from '../ranking';

function movie(overrides: Partial<RankedMovie> & { id: number }): RankedMovie {
  return {
    title: `Película ${overrides.id}`,
    posterUrl: null,
    releaseYear: 2020,
    genres: [],
    rating: 3,
    lastViewedOn: null,
    listIds: [],
    reactionIds: [],
    ...overrides,
  };
}

const movies = [
  movie({ id: 1, releaseYear: 2019, genres: ['Comedia'], rating: 5, listIds: [7] }),
  movie({ id: 2, releaseYear: 2019, genres: ['Drama'], rating: 3.5, reactionIds: [2] }),
  movie({ id: 3, releaseYear: 2021, genres: ['Comedia', 'Romance'], rating: 4.25 }),
  movie({ id: 4, releaseYear: null, genres: ['Terror'], rating: 1 }),
];

describe('filterRanking', () => {
  it('sin filtros devuelve todo', () => {
    expect(filterRanking(movies, EMPTY_FILTERS)).toHaveLength(4);
  });

  it('con 2019 solo deja estrenos de 2019', () => {
    const result = filterRanking(movies, { ...EMPTY_FILTERS, year: 2019 });
    expect(result.map((m) => m.id)).toEqual([1, 2]);
  });

  it('filtra por estrellas mínimas, género, lista y etiqueta', () => {
    expect(filterRanking(movies, { ...EMPTY_FILTERS, minStars: 4 }).map((m) => m.id)).toEqual([1, 3]);
    expect(filterRanking(movies, { ...EMPTY_FILTERS, genre: 'Comedia' }).map((m) => m.id)).toEqual([1, 3]);
    expect(filterRanking(movies, { ...EMPTY_FILTERS, listId: 7 }).map((m) => m.id)).toEqual([1]);
    expect(filterRanking(movies, { ...EMPTY_FILTERS, reactionId: 2 }).map((m) => m.id)).toEqual([2]);
  });

  it('combina filtros', () => {
    expect(filterRanking(movies, { ...EMPTY_FILTERS, year: 2019, genre: 'Comedia' }).map((m) => m.id)).toEqual([1]);
    expect(filterRanking(movies, { ...EMPTY_FILTERS, year: 2019, genre: 'Terror' })).toEqual([]);
  });
});

describe('sortRanking', () => {
  it('ordena por nota descendente', () => {
    expect(sortRanking(movies).map((m) => m.id)).toEqual([1, 3, 2, 4]);
  });

  it('en empate pone primero la vista más reciente y al final las sin vistas', () => {
    const tied = [
      movie({ id: 1, rating: 4, lastViewedOn: null }),
      movie({ id: 2, rating: 4, lastViewedOn: '2026-03-01' }),
      movie({ id: 3, rating: 4, lastViewedOn: '2026-10-01' }),
    ];
    expect(sortRanking(tied).map((m) => m.id)).toEqual([3, 2, 1]);
  });
});

describe('rankingFacets', () => {
  it('lista géneros ordenados y años del más nuevo al más viejo', () => {
    expect(rankingFacets(movies)).toEqual({
      genres: ['Comedia', 'Drama', 'Romance', 'Terror'],
      years: [2021, 2019],
    });
  });
});
