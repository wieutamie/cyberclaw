-- Cyber Claw Schema v1.1
-- PostgreSQL / Supabase Migration

-- profiles: 1-1 with auth.users
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  created_at timestamptz not null default now()
);

-- user_settings
create table if not exists user_settings (
  user_id uuid primary key references profiles(id) on delete cascade,
  timezone text not null default 'Asia/Jakarta',
  date_format text not null default 'DD/MM/YYYY' check (date_format in ('DD/MM/YYYY','MM/DD/YYYY','YYYY-MM-DD')),
  time_format text not null default '24h' check (time_format in ('12h','24h')),
  language text not null default 'id' check (language in ('id','en')),
  default_tab text not null default 'file' check (default_tab in ('file','url','hash','history')),
  danger_threshold int not null default 3 check (danger_threshold between 1 and 10),
  show_upload_warning boolean not null default true,
  auto_open_report boolean not null default false,
  history_retention_days int, -- null = selamanya
  updated_at timestamptz not null default now()
);

-- api_keys
create table if not exists api_keys (
  user_id uuid primary key references profiles(id) on delete cascade,
  provider text not null default 'virustotal',
  encrypted_key text not null, -- base64(iv|tag|ciphertext), AES-256-GCM
  last4 text not null,
  last_verified_at timestamptz,
  created_at timestamptz not null default now()
);

-- Enums
do $$ begin
  create type scan_type as enum ('file','url','hash');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type scan_state as enum ('uploading','queued','in_progress','completed','not_found','failed','timeout','cancelled');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type verdict as enum ('danger','warning','clean');
exception
  when duplicate_object then null;
end $$;

-- scans table
create table if not exists scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type scan_type not null,
  item_label text not null,              -- nama file / URL / hash
  item_sha256 text,
  vt_analysis_id text,
  state scan_state not null default 'queued',
  verdict verdict,                       -- null jika belum selesai / not_found
  stats jsonb,                           -- {malicious, suspicious, harmless, undetected, timeout, failure, unsupported}
  vendor_results jsonb,                  -- array vendor
  item_meta jsonb,                       -- ukuran, tipe, md5, sha1, url info, dll.
  raw_payload jsonb,
  error_code text,
  last_polled_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists scans_user_created_idx on scans(user_id, created_at desc);
create index if not exists scans_user_verdict_idx on scans(user_id, verdict);

-- Row Level Security (RLS)
alter table profiles enable row level security;
alter table user_settings enable row level security;
alter table api_keys enable row level security;
alter table scans enable row level security;

-- Profiles Policies
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- User Settings Policies
create policy "Users can view own settings" on user_settings
  for select using (auth.uid() = user_id);

create policy "Users can update own settings" on user_settings
  for update using (auth.uid() = user_id);

create policy "Users can insert own settings" on user_settings
  for insert with check (auth.uid() = user_id);

-- API Keys: Only server service role can read/write directly, but allow user management
create policy "Users can view own api_keys metadata" on api_keys
  for select using (auth.uid() = user_id);

create policy "Users can insert/update own api_keys" on api_keys
  for all using (auth.uid() = user_id);

-- Scans Policies
create policy "Users can view own scans" on scans
  for select using (auth.uid() = user_id);

create policy "Users can insert own scans" on scans
  for insert with check (auth.uid() = user_id);

create policy "Users can update own scans" on scans
  for update using (auth.uid() = user_id);

create policy "Users can delete own scans" on scans
  for delete using (auth.uid() = user_id);
