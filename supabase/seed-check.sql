-- Conteo para comparar con la app después de ejecutar seed.sql. La cuenta es la que tiene los títulos
-- "[seed]" (seed.sql los recrea para la última cuenta), así no hay que repetir el correo.

--viewsPerMonth(userId, 2026)
with seed_user as (
  select um.user_id as id
  from public.user_movies um
  join public.movies m on m.id = um.movie_id
  where m.title like '[seed] %'
  group by um.user_id
  order by count(*) desc
  limit 1
)
select extract(month from v.viewed_on)::int as month, count(*) as views
from public.movie_views v
join seed_user su on su.id = v.user_id
where v.viewed_on between '2026-01-01' and '2026-12-31'
group by 1
order by 1;

--viewsPerDay(userId, monthPeriod(2026, 7))
with seed_user as (
  select um.user_id as id
  from public.user_movies um
  join public.movies m on m.id = um.movie_id
  where m.title like '[seed] %'
  group by um.user_id
  order by count(*) desc
  limit 1
)
select v.viewed_on as date, count(*) as views
from public.movie_views v
join seed_user su on su.id = v.user_id
where v.viewed_on between '2026-07-01' and '2026-07-31'
group by 1
order by 1;

--minutesWatched(userId, yearPeriod(2026)): sin duración suma 0. titles es el total de títulos de la tarjeta del Wrapped.
with seed_user as (
  select um.user_id as id
  from public.user_movies um
  join public.movies m on m.id = um.movie_id
  where m.title like '[seed] %'
  group by um.user_id
  order by count(*) desc
  limit 1
)
select
  coalesce(sum(coalesce(m.duration_minutes, 0)), 0) as minutes,
  count(*) as views,
  count(distinct v.movie_id) as titles
from public.movie_views v
join public.movies m on m.id = v.movie_id
join seed_user su on su.id = v.user_id
where v.viewed_on between '2026-01-01' and '2026-12-31';

--busiestMonth(userId, 2026): en empate, el mes más temprano.
with seed_user as (
  select um.user_id as id
  from public.user_movies um
  join public.movies m on m.id = um.movie_id
  where m.title like '[seed] %'
  group by um.user_id
  order by count(*) desc
  limit 1
)
select extract(month from v.viewed_on)::int as month, count(*) as views
from public.movie_views v
join seed_user su on su.id = v.user_id
where v.viewed_on between '2026-01-01' and '2026-12-31'
group by 1
order by views desc, month
limit 1;

--topAndBottomRated(userId, 2026): primera fila de cada orden. En empate, la vista más reciente y luego el id menor.
--Como en la app, la peor puntuada nunca repite a la mejor.
with seed_user as (
  select um.user_id as id
  from public.user_movies um
  join public.movies m on m.id = um.movie_id
  where m.title like '[seed] %'
  group by um.user_id
  order by count(*) desc
  limit 1
),
rated as (
  select m.id as movie_id, m.title, um.rating, max(v.viewed_on) as last_viewed_on
  from public.movie_views v
  join public.movies m on m.id = v.movie_id
  join public.user_movies um on um.movie_id = v.movie_id and um.user_id = v.user_id
  join seed_user su on su.id = v.user_id
  where v.viewed_on between '2026-01-01' and '2026-12-31'
    and um.rating is not null
  group by m.id, m.title, um.rating
),
top as (
  select * from rated order by rating desc, last_viewed_on desc, movie_id limit 1
)
(select 'top' as pick, * from top)
union all
(select 'bottom', * from rated
 where movie_id not in (select movie_id from top)
 order by rating asc, last_viewed_on desc, movie_id
 limit 1);

--Un período sin datos: noviembre de 2026 no tiene vistas en el seed.
with seed_user as (
  select um.user_id as id
  from public.user_movies um
  join public.movies m on m.id = um.movie_id
  where m.title like '[seed] %'
  group by um.user_id
  order by count(*) desc
  limit 1
)
select count(*) as views_noviembre
from public.movie_views v
join seed_user su on su.id = v.user_id
where v.viewed_on between '2026-11-01' and '2026-11-30';
