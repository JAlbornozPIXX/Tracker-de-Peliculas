// Lógica del proxy hacia TheMovieDB (ADR-08), sin APIs de Deno: así la prueba
// Jest la ejecuta igual que la Edge Function. index.ts solo la conecta con
// Deno.serve, las variables de entorno y fetch.

export const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
export const TMDB_LANGUAGE = 'es-MX';
export const TMDB_TIMEOUT_MS = 8_000;
export const RATE_LIMIT_PER_MINUTE = 60;

export type ProxyErrorCode =
  | 'unauthorized'
  | 'invalid_request'
  | 'rate_limited'
  | 'not_found'
  | 'tmdb_unavailable'
  | 'misconfigured';

export type ProxyResponse = { status: number; body: unknown };

export type ProxyRequest = {
  method: string;
  authorization: string | null;
  apikey: string | null;
  body: unknown;
};

export type ProxyDeps = {
  tmdbKey: string | undefined;
  // Id del usuario dueño del token, o null si el token no es una sesión válida.
  getUserId: (token: string, apikey: string | null) => Promise<string | null>;
  fetchTmdb: (url: string) => Promise<{ status: number; json: () => Promise<unknown> }>;
  limiter: RateLimiter;
};

function fail(status: number, error: ProxyErrorCode, message: string): ProxyResponse {
  return { status, body: { error, message } };
}

// ——— Validación: solo pasan las rutas y parámetros que la app usa ———

const INT = /^[1-9]\d{0,8}$/;
const INT_LIST = /^[1-9]\d{0,8}(,[1-9]\d{0,8}){0,9}$/;
const BOOLEAN_FALSE = /^false$/;
const MAX_PAGE = 500;
const MAX_QUERY_LENGTH = 100;

type ParamRule = (value: string) => boolean;

const page: ParamRule = (value) => INT.test(value) && Number(value) <= MAX_PAGE;
const query: ParamRule = (value) => value.trim().length > 0 && value.length <= MAX_QUERY_LENGTH;
const int: ParamRule = (value) => INT.test(value);
const zeroOrInt: ParamRule = (value) => value === '0' || INT.test(value);
const intList: ParamRule = (value) => INT_LIST.test(value);
const isFalse: ParamRule = (value) => BOOLEAN_FALSE.test(value);
const popularityDesc: ParamRule = (value) => value === 'popularity.desc';

type Route = { pattern: RegExp; params: Record<string, ParamRule>; required?: string[] };

const ROUTES: Route[] = [
  { pattern: /^\/search\/multi$/, params: { query, page, include_adult: isFalse }, required: ['query'] },
  { pattern: /^\/genre\/movie\/list$/, params: {} },
  {
    pattern: /^\/discover\/movie$/,
    params: {
      page,
      with_genres: intList,
      sort_by: popularityDesc,
      include_adult: isFalse,
      include_video: isFalse,
      'vote_count.gte': zeroOrInt,
      'with_runtime.gte': zeroOrInt,
      'with_runtime.lte': int,
    },
  },
  { pattern: /^\/(movie|tv)\/[1-9]\d{0,8}$/, params: {} },
];

export type ValidRequest = { path: string; params: Record<string, string> };

export function validateRequest(body: unknown): ValidRequest | ProxyResponse {
  if (typeof body !== 'object' || body === null) {
    return fail(400, 'invalid_request', 'Falta el cuerpo de la consulta.');
  }
  const { path, params = {} } = body as { path?: unknown; params?: unknown };
  if (typeof path !== 'string') return fail(400, 'invalid_request', 'Falta la ruta de TheMovieDB.');

  const route = ROUTES.find((candidate) => candidate.pattern.test(path));
  if (!route) return fail(400, 'invalid_request', 'Esa ruta de TheMovieDB no está permitida.');

  if (typeof params !== 'object' || params === null || Array.isArray(params)) {
    return fail(400, 'invalid_request', 'Los parámetros deben ser un objeto.');
  }

  const clean: Record<string, string> = {};
  for (const [name, raw] of Object.entries(params as Record<string, unknown>)) {
    const rule = route.params[name];
    if (!rule) return fail(400, 'invalid_request', `El parámetro ${name} no está permitido.`);
    const value = typeof raw === 'number' ? String(raw) : raw;
    if (typeof value !== 'string' || !rule(value)) {
      return fail(400, 'invalid_request', `El parámetro ${name} no es válido.`);
    }
    clean[name] = value;
  }
  for (const name of route.required ?? []) {
    if (!(name in clean)) return fail(400, 'invalid_request', `Falta el parámetro ${name}.`);
  }
  return { path, params: clean };
}

// ——— Límite de llamadas por usuario ———

/**
 * Ventana deslizante de un minuto por usuario. Vive en la memoria de cada
 * instancia de la función: frena el abuso desde una sesión, pero no es un
 * límite global exacto si Supabase levanta varias instancias.
 */
export class RateLimiter {
  private calls = new Map<string, number[]>();

  constructor(
    private readonly limit = RATE_LIMIT_PER_MINUTE,
    private readonly now: () => number = Date.now
  ) {}

  allow(userId: string): boolean {
    const since = this.now() - 60_000;
    const recent = (this.calls.get(userId) ?? []).filter((time) => time > since);
    if (recent.length >= this.limit) {
      this.calls.set(userId, recent);
      return false;
    }
    recent.push(this.now());
    this.calls.set(userId, recent);
    return true;
  }
}

// ——— Manejo de una consulta ———

function bearerToken(authorization: string | null): string | null {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

export async function handleProxyRequest(request: ProxyRequest, deps: ProxyDeps): Promise<ProxyResponse> {
  if (request.method !== 'POST') return fail(405, 'invalid_request', 'Usa POST.');

  const token = bearerToken(request.authorization);
  const userId = token ? await deps.getUserId(token, request.apikey).catch(() => null) : null;
  if (!userId) return fail(401, 'unauthorized', 'Inicia sesión para buscar en TheMovieDB.');

  const valid = validateRequest(request.body);
  if ('status' in valid) return valid;

  if (!deps.limiter.allow(userId)) {
    return fail(429, 'rate_limited', 'Hiciste muchas consultas seguidas. Intenta en un momento.');
  }

  if (!deps.tmdbKey) return fail(500, 'misconfigured', 'El servidor no tiene configurada la clave de TheMovieDB.');

  const search = new URLSearchParams({ ...valid.params, api_key: deps.tmdbKey, language: TMDB_LANGUAGE });
  try {
    const response = await deps.fetchTmdb(`${TMDB_BASE_URL}${valid.path}?${search.toString()}`);
    if (response.status === 404) return fail(404, 'not_found', 'TheMovieDB no tiene ese título.');
    if (response.status < 200 || response.status >= 300) {
      return fail(503, 'tmdb_unavailable', 'No pudimos conectar con TheMovieDB.');
    }
    return { status: 200, body: await response.json() };
  } catch {
    return fail(503, 'tmdb_unavailable', 'No pudimos conectar con TheMovieDB.');
  }
}
