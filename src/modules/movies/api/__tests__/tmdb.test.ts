import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/utils/supabase';

jest.mock('@/utils/supabase', () => ({
  supabase: {
    functions: { invoke: jest.fn() },
    auth: { refreshSession: jest.fn(), signOut: jest.fn() },
  },
}));

const { discoverMovies, searchMovies, TmdbError } = jest.requireActual<typeof import('../tmdb')>('../tmdb');

const invoke = jest.mocked(supabase.functions.invoke);
const refreshSession = jest.mocked(supabase.auth.refreshSession);
const signOut = jest.mocked(supabase.auth.signOut);

const PAGE = {
  results: [
    { id: 603, title: 'Matrix', poster_path: '/matrix.jpg' },
    { id: 604, poster_path: null },
  ],
  total_results: 1234,
};

function respondWith(data: unknown) {
  invoke.mockResolvedValue({ data, error: null } as never);
}

function failWith(status: number) {
  return { data: null, error: new FunctionsHttpError({ status } as Response) } as never;
}

// Cuerpo enviado a tmdb-proxy en la llamada n.
function sentBody(n = 0): { path: string; params: Record<string, string> } {
  return (invoke.mock.calls[n][1] as { body: { path: string; params: Record<string, string> } }).body;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('discoverMovies', () => {
  it('comedia + romance pide los dos géneros a la vez, con tope de duración y página', async () => {
    respondWith(PAGE);

    await discoverMovies({ genreIds: [35, 10749], maxDurationMinutes: 90 }, 7);

    expect(invoke.mock.calls[0][0]).toBe('tmdb-proxy');
    const { path, params } = sentBody();
    expect(path).toBe('/discover/movie');
    expect(params.with_genres).toBe('35,10749');
    expect(params['with_runtime.lte']).toBe('90');
    // Sin duración cargada TheMovieDB guarda 0: no debe pasar el tope.
    expect(params['with_runtime.gte']).toBe('1');
    expect(params.page).toBe('7');
    expect(params.include_adult).toBe('false');
    expect(Number(params['vote_count.gte'])).toBeGreaterThan(0);
  });

  it('sin filtros consulta todas las películas', async () => {
    respondWith(PAGE);

    await discoverMovies({ genreIds: [], maxDurationMinutes: null }, 1);

    const { params } = sentBody();
    expect('with_genres' in params).toBe(false);
    expect('with_runtime.lte' in params).toBe(false);
  });

  it('devuelve el total y las películas con su póster', async () => {
    respondWith(PAGE);

    await expect(discoverMovies({ genreIds: [], maxDurationMinutes: null }, 1)).resolves.toEqual({
      totalResults: 1234,
      results: [
        { id: 603, title: 'Matrix', posterUrl: 'https://image.tmdb.org/t/p/w342/matrix.jpg' },
        { id: 604, title: 'Sin título', posterUrl: null },
      ],
    });
  });
});

describe('cliente de tmdb-proxy (ADR-08)', () => {
  it('AC-31: la búsqueda va al proxy sin clave de TheMovieDB', async () => {
    respondWith({ results: [], total_pages: 0 });

    await searchMovies('Amélie');

    expect(sentBody()).toEqual({
      path: '/search/multi',
      params: { query: 'Amélie', include_adult: 'false', page: '1' },
    });
    expect(JSON.stringify(sentBody())).not.toMatch(/api_key/);
  });

  it('AC-36: el proxy caído o sin red es «unavailable» y se puede reintentar', async () => {
    invoke.mockResolvedValueOnce(failWith(503));
    const down = await searchMovies('matrix').catch((err: unknown) => err);
    expect(down).toBeInstanceOf(TmdbError);
    expect(down).toMatchObject({ kind: 'unavailable', canRetry: true });

    invoke.mockResolvedValueOnce({ data: null, error: new FunctionsFetchError(new Error('offline')) } as never);
    await expect(searchMovies('matrix')).rejects.toMatchObject({ kind: 'unavailable' });
  });

  it('AC-41: 429 avisa «Intenta en un momento»', async () => {
    invoke.mockResolvedValueOnce(failWith(429));
    await expect(searchMovies('matrix')).rejects.toMatchObject({
      kind: 'rate_limited',
      message: expect.stringMatching(/Intenta en un momento/),
    });
  });

  it('AC-39: con la sesión vencida renueva una vez y reintenta', async () => {
    invoke.mockResolvedValueOnce(failWith(401)).mockResolvedValueOnce({ data: { results: [], total_pages: 0 }, error: null } as never);
    refreshSession.mockResolvedValueOnce({ data: {}, error: null } as never);

    await expect(searchMovies('matrix')).resolves.toEqual({ results: [], totalPages: 0 });
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(signOut).not.toHaveBeenCalled();
  });

  it('AC-39: si la sesión no se puede renovar, cierra la sesión local y la app vuelve al login', async () => {
    invoke.mockResolvedValueOnce(failWith(401));
    refreshSession.mockResolvedValueOnce({ data: {}, error: new Error('refresh token vencido') } as never);

    await expect(searchMovies('matrix')).rejects.toMatchObject({ kind: 'session', canRetry: false });
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('una búsqueda vacía no llama al proxy', async () => {
    await expect(searchMovies('   ')).resolves.toEqual({ results: [], totalPages: 0 });
    expect(invoke).not.toHaveBeenCalled();
  });
});
