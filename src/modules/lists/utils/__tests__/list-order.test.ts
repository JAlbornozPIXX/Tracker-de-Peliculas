import { moveListMovie, sortListMovies } from '../list-order';

const movie = (id: number, position: number | null, added_at: string) => ({ id, position, added_at });

describe('sortListMovies', () => {
  const movies = [movie(1, 3, '2026-01-03'), movie(2, 1, '2026-01-01'), movie(3, 2, '2026-01-05')];

  it('ordena colecciones y playlists por posición', () => {
    expect(sortListMovies('collection', movies).map((m) => m.id)).toEqual([2, 3, 1]);
    expect(sortListMovies('playlist', movies).map((m) => m.id)).toEqual([2, 3, 1]);
  });

  it('deja al final las filas sin posición', () => {
    const withMissing = [movie(1, null, '2026-01-01'), movie(2, 1, '2026-01-02')];
    expect(sortListMovies('collection', withMissing).map((m) => m.id)).toEqual([2, 1]);
  });

  it('ordena carpetas y categorías por lo agregado más recientemente', () => {
    expect(sortListMovies('folder', movies).map((m) => m.id)).toEqual([3, 1, 2]);
    expect(sortListMovies('category', movies).map((m) => m.id)).toEqual([3, 1, 2]);
  });
});

describe('moveListMovie', () => {
  const saga = [
    { id: 10, position: 1 },
    { id: 20, position: 2 },
    { id: 30, position: 3 },
  ];

  it('intercambia dos películas vecinas y solo escribe esas dos', () => {
    const result = moveListMovie(saga, 2, 1);
    expect(result.movies.map((m) => m.id)).toEqual([10, 30, 20]);
    expect(result.changes).toEqual([
      { movieId: 30, position: 2 },
      { movieId: 20, position: 3 },
    ]);
  });

  it('numera de nuevo si había posiciones repetidas o vacías', () => {
    const messy = [
      { id: 1, position: null },
      { id: 2, position: 5 },
      { id: 3, position: 5 },
    ];
    const result = moveListMovie(messy, 0, 1);
    expect(result.movies.map((m) => [m.id, m.position])).toEqual([
      [2, 1],
      [1, 2],
      [3, 3],
    ]);
  });

  it('no hace nada fuera de los bordes', () => {
    expect(moveListMovie(saga, 0, -1).changes).toEqual([]);
    expect(moveListMovie(saga, 2, 3).changes).toEqual([]);
  });
});
