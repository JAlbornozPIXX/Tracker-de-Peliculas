-- Los números que deja supabase/seed.sql, los mismos que muestra
-- seed-check.sql para comparar con la app. Corre en la CI después de cargar
-- el seed: si alguien lo cambia sin actualizar estos números, la CI lo avisa.
do $$
declare
  seed_user constant uuid := (select id from auth.users where email = 'tu-correo@ejemplo.com');
  titles bigint;
  tracked bigint;
  unrated bigint;
  views_2026 bigint;
  views_july bigint;
  views_november bigint;
  views_december_2025 bigint;
begin
  select count(*) into titles from public.movies where title like '[seed] %';

  select count(*), count(*) filter (where um.rating is null)
  into tracked, unrated
  from public.user_movies um
  join public.movies m on m.id = um.movie_id
  where um.user_id = seed_user and m.title like '[seed] %' and um.status = 'watched';

  select
    count(*) filter (where v.viewed_on between date '2026-01-01' and date '2026-12-31'),
    count(*) filter (where v.viewed_on between date '2026-07-01' and date '2026-07-31'),
    count(*) filter (where v.viewed_on between date '2026-11-01' and date '2026-11-30'),
    count(*) filter (where v.viewed_on between date '2025-12-01' and date '2025-12-31')
  into views_2026, views_july, views_november, views_december_2025
  from public.movie_views v
  where v.user_id = seed_user;

  if titles <> 50 then
    raise exception 'seed: % títulos "[seed]", se esperaban 50', titles;
  end if;
  if tracked <> 50 or unrated <> 8 then
    raise exception 'seed: % títulos terminados y % sin nota, se esperaban 50 y 8', tracked, unrated;
  end if;
  if views_2026 <> 230 or views_july <> 52 or views_november <> 0 or views_december_2025 <> 10 then
    raise exception 'seed: vistas 2026 = %, julio = %, noviembre = %, diciembre 2025 = %; se esperaban 230, 52, 0 y 10',
      views_2026, views_july, views_november, views_december_2025;
  end if;

  raise notice 'Seed OK: 50 títulos, 230 vistas en 2026 (52 en julio, el mes de mayor consumo) y 10 en diciembre de 2025.';
end $$;
