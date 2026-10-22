-- Datos sintéticos para probar Estadísticas, Wrapped y Retos.
-- Ejecutar en el SQL Editor de Supabase después de schema.sql, cambiando el correo por el de una cuenta ya registrada.
-- Borra y vuelve a crear todo lo que tenga el seed.
--
-- Determinista (sin random()) para que supabase/seed-check.sql de siempre lo mismo:
--  * 50 títulos: cada 7.º es serie (45 min por episodio), cada 10.º no tiene duración y el resto dura entre 80 y 149 min.
--  * 200 vistas entre el 1 de enero y el 21 de octubre de 2026, más 30 extra en julio (el mes de mayor consumo) y 10 en diciembre de 2025 (no deben contar en 2026).
--  * Nota en cuartos de estrella para cada título, salvo cada 6.º.
do $$
declare
  seed_user uuid := (select id from auth.users where email = 'tu-correo@ejemplo.com');
begin
  if seed_user is null then
    raise exception 'Cambia el correo de seed.sql por el de una cuenta registrada.';
  end if;

  delete from public.movies where title like '[seed] %';

  insert into public.movies (title, genre, duration_minutes, media_type, release_date)
  select
    format('[seed] Título %s', lpad(n::text, 2, '0')),
    array[(array['Comedia', 'Drama', 'Acción', 'Terror', 'Romance'])[1 + n % 5]],
    case when n % 10 = 0 then null when n % 7 = 0 then 45 else 80 + (n * 3) % 70 end,
    case when n % 7 = 0 then 'tv' else 'movie' end,
    make_date(2000 + n % 26, 1 + n % 12, 1)
  from generate_series(1, 50) as n;

  create temporary table seed_movies on commit drop as
  select id, row_number() over (order by title) as n
  from public.movies
  where title like '[seed] %';

  insert into public.user_movies (user_id, movie_id, status, rating)
  select
    seed_user,
    id,
    'watched',
    case when n % 6 = 0 then null else ((n * 7) % 20 + 1) * 0.25 end
  from seed_movies;

  insert into public.movie_views (user_id, movie_id, viewed_on, source)
  select seed_user, m.id, v.viewed_on, 'manual'
  from (
    select 1 + (i * 13) % 50 as n, date '2026-01-01' + (i * 53) % 294 as viewed_on
    from generate_series(1, 200) as i
    union all
    select 1 + (i * 11) % 50, date '2026-07-01' + (i * 5) % 31
    from generate_series(1, 30) as i
    union all
    select 1 + (i * 17) % 50, date '2025-12-01' + i
    from generate_series(1, 10) as i
  ) as v
  join seed_movies as m on m.n = v.n;
end $$;
