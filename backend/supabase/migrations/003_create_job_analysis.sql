create table job_analysis (
  job_id uuid primary key references jobs(id),
  transcript_text text,
  transcript_json jsonb,
  scores jsonb,
  metrics jsonb,
  feedback jsonb,
  presage jsonb,
  debug jsonb,
  created_at timestamptz default now()
);
