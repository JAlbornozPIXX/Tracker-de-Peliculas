-- Lo mínimo de Supabase (roles, auth y storage) para probar schema.sql en un
-- PostgreSQL vacío, local o de la CI. No ejecutar en Supabase: allí todo esto
-- ya existe y este archivo reemplazaría auth.uid().
do $$
begin
  if exists (select from pg_roles where rolname in ('supabase_admin', 'supabase_auth_admin')) then
    raise exception 'Esta base es de Supabase: supabase/tests es solo para un PostgreSQL local o la CI.';
  end if;
end $$;

do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end $$;

-- Como en Supabase: los roles de la app tienen permisos amplios sobre las
-- tablas y lo que protege los datos son las políticas RLS.
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique
);

-- Igual que en Supabase: el usuario sale del JWT de la petición.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      current_setting('request.jwt.claims', true)::jsonb ->> 'sub'
    ),
    ''
  )::uuid
$$;

grant usage on schema auth to anon, authenticated;

create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text not null,
  owner uuid,
  created_at timestamptz not null default now()
);

alter table storage.objects enable row level security;

-- Carpetas de una ruta: 'a/b/foto.png' → {a, b}.
create or replace function storage.foldername(name text)
returns text[]
language sql
immutable
as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;

grant usage on schema storage to anon, authenticated;
grant select, insert, update, delete on storage.objects to anon, authenticated;
grant select on storage.buckets to anon, authenticated;
