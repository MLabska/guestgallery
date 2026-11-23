-- GuestGallery - minimal stand-in for the parts of Supabase that the migration uses.
-- ONLY for the local database test (`npm run test:db`, DESIGN.md section 11), which
-- runs the migration and rls_checks.sql in PGlite (Postgres compiled to WASM,
-- in-process, no Docker, no hosted project).
-- NEVER run this on the real Supabase project: there these objects already exist.
--
-- It copies what Supabase sets up for every new project, as far as the migration
-- and rls_checks.sql depend on it:
--   - roles anon / authenticated / service_role
--   - auth.users + auth.uid() (reads the "sub" claim of request.jwt.claims, like Supabase)
--   - the default grants Supabase gives on the public schema
--   - storage.buckets / storage.objects with RLS enabled and the
--     "no direct DELETE" guard (storage.allow_delete_query)
--   - the supabase_realtime publication

-- ---------- roles ----------
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

-- ---------- auth ----------
create schema auth;
grant usage on schema auth to anon, authenticated, service_role;

create table auth.users (
  id           uuid primary key,
  aud          varchar(255),
  role         varchar(255),
  email        varchar(255),
  is_anonymous boolean not null default false,
  created_at   timestamptz default now()
);

create function auth.uid()
returns uuid
language sql stable
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
    ),
    ''
  )::uuid;
$$;

-- ---------- public schema: Supabase's default privileges ----------
-- Supabase grants everything to these roles and relies on RLS (and explicit
-- revokes in the migration) to restrict access.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

-- ---------- storage ----------
create schema storage;
grant usage on schema storage to anon, authenticated, service_role;

create table storage.buckets (
  id                 text primary key,
  name               text not null unique,
  owner              uuid,
  owner_id           text,
  public             boolean default false,
  file_size_limit    bigint,
  allowed_mime_types text[],
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create table storage.objects (
  id               uuid primary key default gen_random_uuid(),
  bucket_id        text references storage.buckets (id),
  name             text,
  owner            uuid,
  owner_id         text,
  metadata         jsonb,
  user_metadata    jsonb,
  version          text,
  path_tokens      text[] generated always as (string_to_array(name, '/')) stored,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  last_accessed_at timestamptz default now(),
  constraint objects_bucket_name_key unique (bucket_id, name)
);

alter table storage.buckets enable row level security;
alter table storage.objects enable row level security;
grant all on storage.buckets, storage.objects to anon, authenticated, service_role;

-- Supabase blocks raw SQL deletes on storage tables unless this setting is on
-- (rls_checks.sql turns it on, the same way it must on the real project).
create function storage.protect_delete()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('storage.allow_delete_query', true), 'false') <> 'true' then
    raise exception 'Direct deletion from storage tables is not allowed. Use the Storage API instead.';
  end if;
  return null;
end;
$$;

create trigger protect_objects_delete
  before delete on storage.objects
  for each statement execute function storage.protect_delete();

-- ---------- realtime ----------
create publication supabase_realtime;
