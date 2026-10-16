-- Cyber Claw Schema v2.0 — Anonymous sessions
-- PostgreSQL / Supabase Migration
--
-- Cyber Claw no longer has user accounts. Every visitor is an anonymous session
-- whose id is minted and signed by the server. All user-scoped data is keyed by
-- that id, so this migration introduces an `anon_users` table and re-points the
-- existing foreign keys from `profiles` (auth.users) to `anon_users`.

-- 1. Anonymous identity table ------------------------------------------------
create table if not exists anon_users (
  id uuid primary key,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- 2. Re-point child FKs from profiles -> anon_users --------------------------
-- The default constraint name Postgres assigns is `<table>_<column>_fkey`.
alter table scans drop constraint if exists scans_user_id_fkey;
alter table scans add constraint scans_user_id_fkey
  foreign key (user_id) references anon_users(id) on delete cascade;

alter table user_settings drop constraint if exists user_settings_user_id_fkey;
alter table user_settings add constraint user_settings_user_id_fkey
  foreign key (user_id) references anon_users(id) on delete cascade;

alter table api_keys drop constraint if exists api_keys_user_id_fkey;
alter table api_keys add constraint api_keys_user_id_fkey
  foreign key (user_id) references anon_users(id) on delete cascade;

-- 3. Drop the now-unused profiles table (accounts are gone) ------------------
drop table if exists profiles cascade;

-- 4. Row Level Security (defense-in-depth) -----------------------------------
-- The server talks to these tables with the service_role key, which bypasses
-- RLS. Enabling RLS WITHOUT permissive policies means the public anon key can
-- never read/write them directly — only the trusted backend can.
alter table anon_users enable row level security;
alter table user_settings enable row level security;
alter table api_keys enable row level security;
alter table scans enable row level security;
