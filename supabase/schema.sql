-- ════════════════════════════════════════════════════════════════════
-- Calibrate · Supabase schema
-- ════════════════════════════════════════════════════════════════════
-- Tables for cross-device sync of profile, song-mood memory, custom
-- presets, and the mood-bucket time series. All tables enforce RLS
-- so users only see their own rows.
--
-- Run order:
--   1) supabase login                 (CLI)
--   2) supabase link --project-ref <ref>
--   3) supabase db push               (applies this migration)
--   4) or paste this file into the SQL editor in the Supabase dashboard
--
-- © 2026 Sanketh Verma <sankethverma07@gmail.com> · MIT
-- ════════════════════════════════════════════════════════════════════

-- ─── Profile (one row per user) ──────────────────────────────
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_focus_minutes integer not null default 0,
  longest_streak      integer not null default 0,
  achievements        jsonb   not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ─── Song-mood memory ────────────────────────────────────────
-- Per-(user, song) row. `song_key` is "title|artist" (≤240 chars,
-- enforced client-side). `samples` holds per-mood counts.
create table if not exists public.song_moods (
  user_id   uuid not null references auth.users(id) on delete cascade,
  song_key  text not null,
  samples   jsonb not null default '{"cruising":0,"locked":0,"drift":0,"restless":0}'::jsonb,
  total     integer not null default 0,
  dominant  text,
  manual_tag text,
  first_heard timestamptz not null default now(),
  last_heard  timestamptz not null default now(),
  primary key (user_id, song_key)
);

-- ─── Custom EQ overrides per mood ─────────────────────────────
create table if not exists public.custom_eqs (
  user_id uuid not null references auth.users(id) on delete cascade,
  mood    text not null check (mood in ('cruising','locked','drift','restless')),
  bands   real[] not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, mood)
);

-- ─── Named user presets ───────────────────────────────────────
create table if not exists public.named_presets (
  user_id uuid not null references auth.users(id) on delete cascade,
  name    text not null,
  bands   real[] not null,
  created_at timestamptz not null default now(),
  primary key (user_id, name)
);

-- ─── Mood buckets — minute-resolution time series ─────────────
-- Partitioning by month keeps queries fast at scale. Each row is a
-- single one-minute sample.
create table if not exists public.mood_buckets (
  user_id uuid not null references auth.users(id) on delete cascade,
  t       timestamptz not null,
  mood    text not null check (mood in ('cruising','locked','drift','restless','calibrating')),
  primary key (user_id, t)
);
create index if not exists mood_buckets_user_t_idx on public.mood_buckets (user_id, t desc);

-- ════════════════════════════════════════════════════════════════════
-- Row-Level Security — users only see their own rows
-- ════════════════════════════════════════════════════════════════════

alter table public.profiles      enable row level security;
alter table public.song_moods    enable row level security;
alter table public.custom_eqs    enable row level security;
alter table public.named_presets enable row level security;
alter table public.mood_buckets  enable row level security;

create policy "own profile"  on public.profiles      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own songs"    on public.song_moods    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own customs"  on public.custom_eqs    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own presets"  on public.named_presets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own buckets"  on public.mood_buckets  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════════
-- Helper: bootstrap a profile row on user signup (optional)
-- ════════════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id) values (new.id)
  on conflict do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
