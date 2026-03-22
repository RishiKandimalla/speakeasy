-- ── Existing table fixes ───────────────────────────────────────────────────────

-- job_outputs: ensure audio columns exist, drop legacy asset columns
alter table job_outputs
  add column if not exists audio_bucket text,
  add column if not exists audio_path   text;

alter table job_outputs
  drop column if exists caption_bucket,
  drop column if exists caption_path,
  drop column if exists transcript_bucket,
  drop column if exists transcript_path,
  drop column if exists thumbnail_bucket,
  drop column if exists thumbnail_path;

-- job_analysis: ensure tone column exists, drop unused columns
alter table job_analysis
  add column if not exists tone jsonb;

alter table job_analysis
  drop column if exists presage,
  drop column if exists debug;

-- clips table
create table if not exists clips (
  id          uuid    primary key default gen_random_uuid(),
  bucket      text    not null default 'clips',
  path        text    not null unique,
  category    text    not null check (category in ('minecraft', 'drone')),
  duration_s  real,
  file_size   bigint,
  created_at  timestamptz default now()
);

-- ── Profiles ──────────────────────────────────────────────────────────────────

create table if not exists profiles (
  user_id    uuid  primary key,
  username   text  unique not null,
  created_at timestamptz default now()
);

-- ── Posts ─────────────────────────────────────────────────────────────────────

create table if not exists posts (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid references jobs(id),
  user_id         uuid not null,
  audio_bucket    text not null,
  audio_path      text not null,
  transcript_json jsonb,
  created_at      timestamptz default now()
);

create index if not exists posts_created_at_idx on posts (created_at desc);
create index if not exists posts_user_id_idx    on posts (user_id);

-- ── Follows ───────────────────────────────────────────────────────────────────

create table if not exists follows (
  follower_id  uuid not null,
  following_id uuid not null,
  created_at   timestamptz default now(),
  primary key (follower_id, following_id)
);

create index if not exists follows_following_id_idx on follows (following_id);

-- ── Post reactions ────────────────────────────────────────────────────────────

create table if not exists post_reactions (
  id          uuid  primary key default gen_random_uuid(),
  post_id     uuid  not null references posts(id) on delete cascade,
  user_id     uuid  not null,
  emoji       text  not null,
  timestamp_s float not null,
  created_at  timestamptz default now()
);

create index if not exists post_reactions_post_id_idx on post_reactions (post_id);

-- ── Post views ────────────────────────────────────────────────────────────────

create table if not exists post_views (
  user_id   uuid not null,
  post_id   uuid not null references posts(id) on delete cascade,
  viewed_at timestamptz default now(),
  primary key (user_id, post_id)
);

create index if not exists post_views_user_id_idx on post_views (user_id);

-- ── User stats ────────────────────────────────────────────────────────────────

create table if not exists user_stats (
  user_id         uuid primary key,
  streak_days     int  not null default 0,
  last_active_date date,
  total_sessions  int  not null default 0,
  weekly_history  jsonb not null default '[]',
  updated_at      timestamptz default now()
);
