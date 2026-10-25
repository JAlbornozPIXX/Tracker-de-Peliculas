-- SPIKE-02: cuánto cuesta leer las notas propias con RLS (como la app, rol
-- authenticated) frente a sin RLS (superusuario), con 2 usuarios y 500
-- títulos cada uno. Manual, no corre en la CI (los tiempos dependen del
-- equipo). En un PostgreSQL local ya preparado con supabase/tests/run.sh:
--   psql -X -q -f supabase/tests/rls-benchmark.sql
-- Todo queda dentro de una transacción que se deshace al final.

begin;

insert into auth.users (id, email) values
  ('31111111-1111-4111-8111-111111111111', 'ana@spike.test'),
  ('32222222-2222-4222-8222-222222222222', 'beto@spike.test');

insert into public.movies (title, tmdb_id, media_type)
select format('[spike] Título %s', n), 980000 + n, 'movie'
from generate_series(1, 500) as n;

insert into public.user_movies (user_id, movie_id, status, rating, notes)
select u.id, m.id, 'watched', 4, 'Nota privada'
from public.movies m
cross join (values ('31111111-1111-4111-8111-111111111111'::uuid), ('32222222-2222-4222-8222-222222222222'::uuid)) as u (id)
where m.title like '[spike] %';

analyze public.user_movies;

-- p95 en ms de la consulta que hace la app para leer los títulos de Ana.
create function pg_temp.p95_ms(runs integer)
returns numeric
language plpgsql
as $$
declare
  started timestamptz;
  samples double precision[] := '{}';
begin
  for i in 1..runs loop
    started := clock_timestamp();
    perform movie_id, status, rating, notes
    from public.user_movies
    where user_id = '31111111-1111-4111-8111-111111111111';
    samples := samples || extract(epoch from clock_timestamp() - started) * 1000;
  end loop;
  return (select round(percentile_cont(0.95) within group (order by s)::numeric, 3) from unnest(samples) as s);
end;
$$;

-- Sin RLS: el superusuario se salta las políticas.
select pg_temp.p95_ms(50) as calentamiento \gset
select pg_temp.p95_ms(500) as p95_sin_rls \gset

-- Con RLS: la sesión de Ana, igual que la app.
select set_config('role', 'authenticated', true), set_config('request.jwt.claim.sub', '31111111-1111-4111-8111-111111111111', true) \gset
select count(*) as filas_de_ana from public.user_movies \gset
select pg_temp.p95_ms(50) as calentamiento \gset
select pg_temp.p95_ms(500) as p95_con_rls \gset
reset role;

select current_setting('server_version') as version \gset
\echo 'SPIKE-02 (500 títulos por usuario, 500 lecturas): p95 sin RLS' :p95_sin_rls 'ms; con RLS' :p95_con_rls 'ms; Ana ve' :filas_de_ana 'filas; PostgreSQL' :version

rollback;
