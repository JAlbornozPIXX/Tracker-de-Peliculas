-- T-12 (SEG-01, AC-SEG-01, ADR-03): con las políticas RLS, un usuario no lee,
-- no modifica ni crea datos de otro. Ana guarda una nota privada y datos en
-- cada tabla; Beto, con su propia sesión, no debe ver ni tocar nada de eso.
-- También comprueba AC-05 y RN-01/RN-02 (calificación en cuartos y cinco
-- estados). Corre en la CI después de schema.sql y termina con error si algo
-- falla. Todo queda dentro de una transacción que se deshace al final.

begin;

-- Afirmaciones: cada una lanza un error con su descripción si no se cumple.
create function pg_temp.expect_count(query text, expected bigint, label text)
returns void
language plpgsql
as $$
declare
  actual bigint;
begin
  execute query into actual;
  if actual is distinct from expected then
    raise exception 'T-12: % (se esperaba %, hubo %)', label, expected, actual;
  end if;
end;
$$;

create function pg_temp.expect_changed(statement text, expected bigint, label text)
returns void
language plpgsql
as $$
declare
  actual bigint;
begin
  execute statement;
  get diagnostics actual = row_count;
  if actual <> expected then
    raise exception 'T-12: % (se esperaban % filas, cambiaron %)', label, expected, actual;
  end if;
end;
$$;

create function pg_temp.expect_error(statement text, sqlstate_expected text, label text)
returns void
language plpgsql
as $$
begin
  execute statement;
  raise exception 'T-12: % (no dio error)', label;
exception
  when others then
    if sqlstate <> sqlstate_expected then
      raise;
    end if;
end;
$$;

-- Cada consulta corre como lo hace la app: rol authenticated y el usuario
-- en el JWT. auth.uid() lo lee de request.jwt.claim.sub.
create function pg_temp.login(user_id text)
returns void
language sql
as $$
  select set_config('role', 'authenticated', true), set_config('request.jwt.claim.sub', user_id, true);
$$;

-- Ninguna tabla de la app puede quedar sin RLS (una tabla nueva sin
-- políticas quedaría expuesta).
select pg_temp.expect_count(
  $q$select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity$q$,
  0,
  'hay tablas de public sin RLS'
);

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'ana@rls.test'),
  ('22222222-2222-4222-8222-222222222222', 'beto@rls.test');

-- Ana registra un título con nota privada y datos en cada tabla.
select pg_temp.login('11111111-1111-4111-8111-111111111111');

insert into public.movies (title, tmdb_id, media_type) values ('[rls] Película de Ana', 990001, 'movie');
insert into public.user_movies (user_id, movie_id, status, rating, notes)
select '11111111-1111-4111-8111-111111111111', id, 'watched', 4.25, 'Nota privada de Ana'
from public.movies where tmdb_id = 990001;
insert into public.lists (user_id, name) values ('11111111-1111-4111-8111-111111111111', 'Lista de Ana');
insert into public.list_movies (list_id, movie_id)
select l.id, m.id from public.lists l, public.movies m
where l.name = 'Lista de Ana' and m.tmdb_id = 990001;
insert into public.movie_views (user_id, movie_id, viewed_on)
select '11111111-1111-4111-8111-111111111111', id, date '2026-10-01' from public.movies where tmdb_id = 990001;
insert into public.reactions (user_id, emoji, name) values ('11111111-1111-4111-8111-111111111111', '🙂', 'De Ana');
insert into public.user_movie_reactions (user_id, movie_id, reaction_id)
select '11111111-1111-4111-8111-111111111111', m.id, r.id from public.movies m, public.reactions r
where m.tmdb_id = 990001 and r.name = 'De Ana';
insert into public.challenges (user_id, title, target_count, starts_on, ends_on)
values ('11111111-1111-4111-8111-111111111111', 'Reto de Ana', 3, date '2026-10-01', date '2026-10-31');
insert into public.profiles (id, display_name) values ('11111111-1111-4111-8111-111111111111', 'Ana');
insert into storage.objects (bucket_id, name)
values ('avatars', '11111111-1111-4111-8111-111111111111/avatar.png');

-- Beto no puede ver la lista de Ana: su id se guarda ahora para intentar usarlo.
select id as ana_list_id from public.lists where name = 'Lista de Ana' \gset

-- Control: Ana sí ve lo suyo (si no, la prueba de Beto no probaría nada).
select pg_temp.expect_count($q$select count(*) from public.user_movies where notes = 'Nota privada de Ana'$q$, 1, 'Ana no ve su propia nota');
select pg_temp.expect_count($q$select count(*) from public.lists$q$, 1, 'Ana no ve su lista');
select pg_temp.expect_count($q$select count(*) from public.list_movies$q$, 1, 'Ana no ve las películas de su lista');
select pg_temp.expect_count($q$select count(*) from public.movie_views$q$, 1, 'Ana no ve sus vistas');
select pg_temp.expect_count($q$select count(*) from public.reactions where name = 'De Ana'$q$, 1, 'Ana no ve su calificador');
select pg_temp.expect_count($q$select count(*) from public.user_movie_reactions$q$, 1, 'Ana no ve sus calificadores marcados');
select pg_temp.expect_count($q$select count(*) from public.challenges$q$, 1, 'Ana no ve su reto');
select pg_temp.expect_count($q$select count(*) from public.profiles$q$, 1, 'Ana no ve su perfil');

-- AC-05 y RN-02: la calificación va de 0,25 a 5 en cuartos; RN-01: cinco estados.
select pg_temp.expect_error($q$update public.user_movies set rating = 4.30$q$, '23514', 'AC-05: se aceptó 4,30 estrellas');
select pg_temp.expect_error($q$update public.user_movies set rating = 0$q$, '23514', 'RN-02: se aceptó 0 estrellas');
select pg_temp.expect_error($q$update public.user_movies set rating = 5.25$q$, '23514', 'RN-02: se aceptó 5,25 estrellas');
select pg_temp.expect_changed($q$update public.user_movies set rating = 3.75$q$, 1, 'RN-02: no se aceptó 3,75 estrellas');
select pg_temp.expect_error($q$update public.user_movies set status = 'otro'$q$, '23514', 'RN-01: se aceptó un estado fuera de los cinco');

-- Beto, con su propia sesión.
select pg_temp.login('22222222-2222-4222-8222-222222222222');

-- No lee nada de Ana: la nota privada no aparece en ninguna respuesta.
select pg_temp.expect_count($q$select count(*) from public.user_movies$q$, 0, 'Beto lee user_movies de Ana');
select pg_temp.expect_count($q$select count(*) from public.user_movies where notes is not null$q$, 0, 'Beto lee la nota privada de Ana');
select pg_temp.expect_count($q$select count(*) from public.lists$q$, 0, 'Beto lee las listas de Ana');
select pg_temp.expect_count($q$select count(*) from public.list_movies$q$, 0, 'Beto lee las películas de la lista de Ana');
select pg_temp.expect_count($q$select count(*) from public.movie_views$q$, 0, 'Beto lee las vistas de Ana');
select pg_temp.expect_count($q$select count(*) from public.reactions where name = 'De Ana'$q$, 0, 'Beto lee el calificador propio de Ana');
select pg_temp.expect_count($q$select count(*) from public.user_movie_reactions$q$, 0, 'Beto lee los calificadores de Ana');
select pg_temp.expect_count($q$select count(*) from public.challenges$q$, 0, 'Beto lee los retos de Ana');
select pg_temp.expect_count($q$select count(*) from public.profiles$q$, 0, 'Beto lee el perfil de Ana');
-- Los calificadores base sí son de todos.
select pg_temp.expect_count($q$select (count(*) > 0)::int from public.reactions where user_id is null$q$, 1, 'Beto no ve los calificadores base');

-- No modifica ni borra nada de Ana.
select pg_temp.expect_changed($q$update public.user_movies set notes = 'Pisada por Beto'$q$, 0, 'Beto modificó la nota de Ana');
select pg_temp.expect_changed($q$delete from public.user_movies$q$, 0, 'Beto borró el título de Ana');
select pg_temp.expect_changed($q$update public.lists set name = 'De Beto'$q$, 0, 'Beto renombró la lista de Ana');
select pg_temp.expect_changed($q$delete from public.lists$q$, 0, 'Beto borró la lista de Ana');
select pg_temp.expect_changed($q$update public.list_movies set position = 99$q$, 0, 'Beto reordenó la lista de Ana');
select pg_temp.expect_changed($q$delete from public.list_movies$q$, 0, 'Beto sacó películas de la lista de Ana');
select pg_temp.expect_changed($q$delete from public.movie_views$q$, 0, 'Beto borró las vistas de Ana');
select pg_temp.expect_changed($q$update public.user_movie_reactions set selected = false$q$, 0, 'Beto desmarcó los calificadores de Ana');
select pg_temp.expect_changed($q$update public.challenges set target_count = 99$q$, 0, 'Beto modificó el reto de Ana');
select pg_temp.expect_changed($q$delete from public.challenges$q$, 0, 'Beto borró el reto de Ana');
select pg_temp.expect_changed($q$update public.profiles set display_name = 'Beto'$q$, 0, 'Beto modificó el perfil de Ana');
select pg_temp.expect_changed(
  $q$update storage.objects set name = '11111111-1111-4111-8111-111111111111/otra.png' where bucket_id = 'avatars'$q$,
  0,
  'Beto reemplazó la foto de Ana'
);

-- No crea nada a nombre de Ana ni dentro de sus datos (42501: la fila no
-- cumple la política RLS).
insert into public.movies (title, tmdb_id, media_type) values ('[rls] Película de Beto', 990002, 'movie');
select pg_temp.expect_error(
  $q$insert into public.user_movies (user_id, movie_id, status, notes)
     select '11111111-1111-4111-8111-111111111111', id, 'watchlist', 'Nota de Beto' from public.movies where tmdb_id = 990002$q$,
  '42501',
  'Beto creó un título a nombre de Ana'
);
select pg_temp.expect_error(
  $q$insert into public.lists (user_id, name) values ('11111111-1111-4111-8111-111111111111', 'Lista falsa')$q$,
  '42501',
  'Beto creó una lista a nombre de Ana'
);
select pg_temp.expect_error(
  format(
    $q$insert into public.list_movies (list_id, movie_id) select %s, id from public.movies where tmdb_id = 990002$q$,
    :ana_list_id
  ),
  '42501',
  'Beto agregó una película a la lista de Ana'
);
select pg_temp.expect_error(
  $q$insert into public.movie_views (user_id, movie_id, viewed_on)
     select '11111111-1111-4111-8111-111111111111', id, date '2026-10-02' from public.movies where tmdb_id = 990002$q$,
  '42501',
  'Beto registró una vista a nombre de Ana'
);
select pg_temp.expect_error(
  $q$insert into public.challenges (user_id, title, target_count, starts_on, ends_on)
     values ('11111111-1111-4111-8111-111111111111', 'Reto falso', 1, date '2026-10-01', date '2026-10-31')$q$,
  '42501',
  'Beto creó un reto a nombre de Ana'
);
select pg_temp.expect_error(
  $q$insert into storage.objects (bucket_id, name) values ('avatars', '11111111-1111-4111-8111-111111111111/falsa.png')$q$,
  '42501',
  'Beto subió una foto a la carpeta de Ana'
);

-- Sin sesión (anon) tampoco se ve nada personal.
select set_config('role', 'anon', true), set_config('request.jwt.claim.sub', '', true);
select pg_temp.expect_count($q$select count(*) from public.user_movies$q$, 0, 'anon lee user_movies');
select pg_temp.expect_count($q$select count(*) from public.lists$q$, 0, 'anon lee listas');
select pg_temp.expect_count($q$select count(*) from public.movie_views$q$, 0, 'anon lee vistas');
select pg_temp.expect_count($q$select count(*) from public.challenges$q$, 0, 'anon lee retos');
select pg_temp.expect_count($q$select count(*) from public.profiles$q$, 0, 'anon lee perfiles');

\echo 'T-12 OK: con RLS, Beto y anon no leen, modifican ni crean datos de Ana; AC-05, RN-01 y RN-02 se cumplen.'

rollback;
