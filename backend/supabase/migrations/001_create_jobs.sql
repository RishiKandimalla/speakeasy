create table jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  upload_id uuid not null,
  status text not null default 'queued',
  stage text not null default 'pending',
  progress int not null default 0,
  options jsonb not null default '{}',
  context jsonb,
  attempt_count int not null default 0,
  claimed_by text,
  error_message text,
  created_at timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz default now()
);
