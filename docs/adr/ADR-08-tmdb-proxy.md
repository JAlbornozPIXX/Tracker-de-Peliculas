# ADR-08: Las llamadas a TheMovieDB pasan por la Edge Function `tmdb-proxy`

- **Estado:** aceptada (Incremento 3, L2)
- **Riesgo que atiende:** R1 / observación C12 de la segunda defensa: la clave de TheMovieDB iba en el cliente (`EXPO_PUBLIC_TMDB_API_KEY`) y cualquiera podía sacarla del APK.

## Contexto

Las variables `EXPO_PUBLIC_*` quedan dentro del bundle de JavaScript. Al distribuir un APK, la clave de TheMovieDB queda expuesta: alguien puede usarla con nuestra cuota, y si TheMovieDB la revoca se caen la búsqueda, la ruleta y las fichas para todos los usuarios.

## Decisión

La app no llama a `api.themoviedb.org`. Toda consulta va a la Edge Function `tmdb-proxy` de Supabase con `supabase.functions.invoke`, que:

1. **Exige sesión:** valida el token del usuario contra `auth/v1/user`. Sin sesión válida responde 401. La función se despliega con `--no-verify-jwt` porque la verificación automática no funciona con las claves `sb_publishable_`; la validación la hace la propia función.
2. **Solo deja pasar lo que la app usa:** `/search/multi`, `/genre/movie/list`, `/discover/movie`, `/movie/{id}` y `/tv/{id}`, cada una con su lista de parámetros válidos (búsqueda de 1 a 100 caracteres, página 1 a 500, ids y géneros numéricos, nunca contenido para adultos). Cualquier otra cosa recibe 400.
3. **Agrega la clave y el idioma** (`es-MX`) en el servidor. La clave vive en los secretos de Supabase (`TMDB_KEY`).
4. **Limita a 60 llamadas por minuto por usuario** (429 «Intenta en un momento»).
5. **Devuelve errores tipados:** TheMovieDB caído o lento → 503 `tmdb_unavailable`, que la app muestra como «No pudimos conectar con TheMovieDB» con «Reintentar», distinto de «Sin resultados».

En el cliente (`src/modules/movies/api/tmdb.ts`), un 401 renueva la sesión una vez y, si no se puede, cierra la sesión local y la app vuelve al login.

## Alternativa descartada

**Ofuscar la clave en el cliente.** Solo demora a quien la busque: la clave sigue viajando dentro del APK. No cierra el riesgo.

## Consecuencias

- Cada consulta suma un salto más (cliente → Supabase → TheMovieDB). Hay que medir la latencia en un teléfono; el umbral de la búsqueda es p95 < 2 s.
- El proxy es un punto único hacia TheMovieDB: si la función falla, fallan la búsqueda, la ruleta y las fichas que no están en la base. La app lo muestra como error reintentable.
- El límite de 60 por minuto vive en la memoria de cada instancia de la función: frena el abuso desde una sesión, pero no es un tope global exacto si Supabase levanta varias instancias. Queda como riesgo mitigado.
- Hay que desplegar la función y cargar `TMDB_KEY` antes de repartir un APK (ver README).

## Cómo se verifica

- `supabase/functions/tmdb-proxy/__tests__/handler.test.ts`: AC-31 (reenvío con clave y es-MX), AC-36 (503 tipado), AC-39 (401 sin sesión o con token vencido), AC-40 (entradas inválidas → 400) y AC-41 (429 en la llamada 61).
- `src/modules/movies/api/__tests__/tmdb.test.ts`: el cliente no envía `api_key`, traduce los errores y renueva la sesión o vuelve al login.
- CI: el paso «Sin llamadas directas a TheMovieDB» falla si `src/` contiene `api.themoviedb.org` o `TMDB_API_KEY`.
