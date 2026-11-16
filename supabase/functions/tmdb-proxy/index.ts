// Edge Function tmdb-proxy (ADR-08): la app ya no lleva la clave de
// TheMovieDB; toda consulta pasa por aquí con la sesión del usuario.
// Desplegar con: npx supabase functions deploy tmdb-proxy --no-verify-jwt
// (la sesión se valida dentro, ver handler.ts) y la clave con
// npx supabase secrets set TMDB_KEY=...
import { handleProxyRequest, RateLimiter, TMDB_TIMEOUT_MS } from './handler.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const limiter = new RateLimiter();

async function getUserId(token: string, apikey: string | null): Promise<string | null> {
  const key = apikey ?? Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !key) return null;
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: key },
  });
  if (!response.ok) return null;
  const user = (await response.json()) as { id?: string };
  return user.id ?? null;
}

function fetchTmdb(url: string) {
  return fetch(url, { signal: AbortSignal.timeout(TMDB_TIMEOUT_MS) });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  const body = await req.json().catch(() => null);
  const result = await handleProxyRequest(
    {
      method: req.method,
      authorization: req.headers.get('Authorization'),
      apikey: req.headers.get('apikey'),
      body,
    },
    { tmdbKey: Deno.env.get('TMDB_KEY'), getUserId, fetchTmdb, limiter }
  );

  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
});
