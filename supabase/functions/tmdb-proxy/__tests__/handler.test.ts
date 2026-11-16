import { handleProxyRequest, ProxyDeps, ProxyRequest, RateLimiter, validateRequest } from '../handler';

const SEARCH = { path: '/search/multi', params: { query: 'Amélie', page: '1', include_adult: 'false' } };

function deps(overrides: Partial<ProxyDeps> = {}): ProxyDeps & { fetchTmdb: jest.Mock } {
  return {
    tmdbKey: 'clave-secreta',
    getUserId: async (token) => (token === 'sesion-valida' ? 'usuario-1' : null),
    fetchTmdb: jest.fn(async () => ({ status: 200, json: async () => ({ results: [], total_pages: 0 }) })),
    limiter: new RateLimiter(),
    ...overrides,
  } as ProxyDeps & { fetchTmdb: jest.Mock };
}

function request(body: unknown, authorization: string | null = 'Bearer sesion-valida'): ProxyRequest {
  return { method: 'POST', authorization, apikey: 'sb_publishable_x', body };
}

describe('tmdb-proxy', () => {
  it('AC-31: reenvía la búsqueda a TheMovieDB con la clave del servidor y es-MX', async () => {
    const d = deps();
    const result = await handleProxyRequest(request(SEARCH), d);

    expect(result.status).toBe(200);
    const url = new URL(d.fetchTmdb.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe('https://api.themoviedb.org/3/search/multi');
    expect(url.searchParams.get('query')).toBe('Amélie');
    expect(url.searchParams.get('api_key')).toBe('clave-secreta');
    expect(url.searchParams.get('language')).toBe('es-MX');
  });

  it('AC-39: sin token o con un token vencido responde 401 y no llama a TheMovieDB', async () => {
    const d = deps();
    expect((await handleProxyRequest(request(SEARCH, null), d)).status).toBe(401);
    expect((await handleProxyRequest(request(SEARCH, 'Bearer vencido'), d)).status).toBe(401);
    expect(d.fetchTmdb).not.toHaveBeenCalled();
  });

  it('AC-39: un fallo al validar la sesión también es 401, no un error interno', async () => {
    const d = deps({ getUserId: async () => Promise.reject(new Error('sin red')) });
    expect((await handleProxyRequest(request(SEARCH), d)).status).toBe(401);
  });

  it('AC-36: TheMovieDB caído responde 503 tmdb_unavailable, distinto de "sin resultados"', async () => {
    const down = deps({ fetchTmdb: jest.fn(async () => ({ status: 503, json: async () => ({}) })) });
    const result = await handleProxyRequest(request(SEARCH), down);
    expect(result).toEqual({ status: 503, body: expect.objectContaining({ error: 'tmdb_unavailable' }) });

    const timeout = deps({ fetchTmdb: jest.fn(async () => Promise.reject(new Error('timeout'))) });
    expect((await handleProxyRequest(request(SEARCH), timeout)).status).toBe(503);
  });

  it('AC-41: la llamada 61 dentro del mismo minuto responde 429', async () => {
    let now = 0;
    const d = deps({ limiter: new RateLimiter(60, () => now) });
    for (let i = 0; i < 60; i++) {
      expect((await handleProxyRequest(request(SEARCH), d)).status).toBe(200);
    }
    expect((await handleProxyRequest(request(SEARCH), d)).status).toBe(429);

    now += 60_001;
    expect((await handleProxyRequest(request(SEARCH), d)).status).toBe(200);
  });

  it('sin la clave configurada en el servidor responde un error tipado', async () => {
    const result = await handleProxyRequest(request(SEARCH), deps({ tmdbKey: undefined }));
    expect(result).toEqual({ status: 500, body: expect.objectContaining({ error: 'misconfigured' }) });
  });

  it('un título que TheMovieDB no tiene responde 404', async () => {
    const d = deps({ fetchTmdb: jest.fn(async () => ({ status: 404, json: async () => ({}) })) });
    expect((await handleProxyRequest(request({ path: '/movie/99999999' }), d)).status).toBe(404);
  });
});

describe('validateRequest (AC-40)', () => {
  it.each([
    ['búsqueda vacía', { path: '/search/multi', params: { query: '   ' } }],
    ['búsqueda de más de 100 caracteres', { path: '/search/multi', params: { query: 'a'.repeat(101) } }],
    ['página 0', { path: '/search/multi', params: { query: 'matrix', page: '0' } }],
    ['página 501', { path: '/discover/movie', params: { page: '501' } }],
    ['ruta no permitida', { path: '/account', params: {} }],
    ['ruta con otra ruta adentro', { path: '/movie/1/../../account', params: {} }],
    ['parámetro desconocido', { path: '/discover/movie', params: { api_key: 'otra' } }],
    ['contenido para adultos', { path: '/search/multi', params: { query: 'x', include_adult: 'true' } }],
    ['géneros con texto', { path: '/discover/movie', params: { with_genres: '35,drop' } }],
    ['sin cuerpo', null],
  ])('rechaza %s con 400', (_name, body) => {
    expect(validateRequest(body)).toEqual({ status: 400, body: expect.objectContaining({ error: 'invalid_request' }) });
  });

  it('acepta lo que usa la app: ruleta, géneros y detalle', () => {
    expect(
      validateRequest({
        path: '/discover/movie',
        params: { with_genres: '35,10749', 'with_runtime.lte': 90, page: 7, sort_by: 'popularity.desc' },
      })
    ).toEqual({
      path: '/discover/movie',
      params: { with_genres: '35,10749', 'with_runtime.lte': '90', page: '7', sort_by: 'popularity.desc' },
    });
    expect(validateRequest({ path: '/genre/movie/list' })).toEqual({ path: '/genre/movie/list', params: {} });
    expect(validateRequest({ path: '/tv/1399' })).toEqual({ path: '/tv/1399', params: {} });
  });
});
