-- Conteo para comparar con la app después de ejecutar seed.sql.

--viewsPerMonth(userId, 2026)
select extract(month from v.viewed_on)::int as month, count(*) as views
from public.movie_views v
join auth.users u on u.id = v.user_id
where u.email = 'tu-correo@ejemplo.com'
  and v.viewed_on between '2026-01-01' and '2026-12-31'
group by 1
order by 1;

--viewsPerDay(userId, monthPeriod(2026, 7))
select v.viewed_on as date, count(*) as views
from public.movie_views v
join auth.users u on u.id = v.user_id
where u.email = 'tu-correo@ejemplo.com'
  and v.viewed_on between '2026-07-01' and '2026-07-31'
group by 1
order by 1;

--minutesWatched(userId, yearPeriod(2026)): sin duración suma 0.
select coalesce(sum(coalesce(m.duration_minutes, 0)), 0) as minutes, count(*) as views
from public.movie_views v
join public.movies m on m.id = v.movie_id
join auth.users u on u.id = v.user_id
where u.email = 'tu-correo@ejemplo.com'
  and v.viewed_on between '2026-01-01' and '2026-12-31';

--busiestMonth(userId, 2026): en empate, el mes más temprano.
select extract(month from v.viewed_on)::int as month, count(*) as views
from public.movie_views v
join auth.users u on u.id = v.user_id
where u.email = 'tu-correo@ejemplo.com'
  and v.viewed_on between '2026-01-01' and '2026-12-31'
group by 1
order by views desc, month
limit 1;

--topAndBottomRated(userId, 2026): primera fila de cada orden. En empate, la vista más reciente y luego el id menor.
with rated as (
  select m.id as movie_id, m.title, um.rating, max(v.viewed_on) as last_viewed_on
  from public.movie_views v
  join public.movies m on m.id = v.movie_id
  join public.user_movies um on um.movie_id = v.movie_id and um.user_id = v.user_id
  join auth.users u on u.id = v.user_id
  where u.email = 'tu-correo@ejemplo.com'
    and v.viewed_on between '2026-01-01' and '2026-12-31'
    and um.rating is not null
  group by m.id, m.title, um.rating
)
(select 'top' as pick, * from rated order by rating desc, last_viewed_on desc, movie_id limit 1)
union all
(select 'bottom', * from rated order by rating asc, last_viewed_on desc, movie_id limit 1);

--Un período sin datos: noviembre de 2026 no tiene vistas en el seed.
select count(*) as views_noviembre
from public.movie_views v
join auth.users u on u.id = v.user_id
where u.email = 'tu-correo@ejemplo.com'
  and v.viewed_on between '2026-11-01' and '2026-11-30';
