create table clips (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'clips',
  path text not null unique,
  category text not null check (category in ('minecraft', 'drone')),
  duration_s real,
  file_size bigint,
  created_at timestamptz default now()
);
