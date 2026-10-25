process.env.EXPO_PUBLIC_TMDB_API_KEY = 'clave-de-prueba';

const { discoverMovies } = jest.requireActual<typeof import('../tmdb')>('../tmdb');

function respondWith(body: unknown) {
  return jest.fn(async (_url: string) => ({ ok: true, status: 200, json: async () => body }));
}

const PAGE = {
  results: [
    { id: 603, title: 'Matrix', poster_path: '/matrix.jpg' },
    { id: 604, poster_path: null },
  ],
  total_results: 1234,
};

function requestedParams(fetchMock: jest.Mock): URLSearchParams {
  return new URL(fetchMock.mock.calls[0][0]).searchParams;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('discoverMovies', () => {
  it('comedia + romance pide los dos géneros a la vez, con tope de duración y página', async () => {
    const fetchMock = respondWith(PAGE);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await discoverMovies({ genreIds: [35, 10749], maxDurationMinutes: 90 }, 7);

    const params = requestedParams(fetchMock);
    expect(new URL(fetchMock.mock.calls[0][0]).pathname).toBe('/3/discover/movie');
    expect(params.get('with_genres')).toBe('35,10749');
    expect(params.get('with_runtime.lte')).toBe('90');
    // Sin duración cargada TheMovieDB guarda 0: no debe pasar el tope.
    expect(params.get('with_runtime.gte')).toBe('1');
    expect(params.get('page')).toBe('7');
    expect(params.get('include_adult')).toBe('false');
    expect(Number(params.get('vote_count.gte'))).toBeGreaterThan(0);
  });

  it('sin filtros consulta todas las películas', async () => {
    const fetchMock = respondWith(PAGE);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await discoverMovies({ genreIds: [], maxDurationMinutes: null }, 1);

    const params = requestedParams(fetchMock);
    expect(params.has('with_genres')).toBe(false);
    expect(params.has('with_runtime.lte')).toBe(false);
  });

  it('devuelve el total y las películas con su póster', async () => {
    globalThis.fetch = respondWith(PAGE) as unknown as typeof fetch;

    await expect(discoverMovies({ genreIds: [], maxDurationMinutes: null }, 1)).resolves.toEqual({
      totalResults: 1234,
      results: [
        { id: 603, title: 'Matrix', posterUrl: 'https://image.tmdb.org/t/p/w342/matrix.jpg' },
        { id: 604, title: 'Sin título', posterUrl: null },
      ],
    });
  });
});
