-- ── Notifications ─────────────────────────────────────────────────────────────

create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  post_id     uuid not null references posts(id) on delete cascade,
  type        text not null default 'reaction',
  emoji       text,
  read        boolean not null default false,
  created_at  timestamptz default now()
);

create index if not exists notifications_user_id_idx
  on notifications (user_id, created_at desc);
