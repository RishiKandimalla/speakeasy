create table uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  bucket text not null,
  path text not null,
  filename text,
  content_type text,
  file_size bigint,
  status text not null default 'ready',
  created_at timestamptz default now()
);
