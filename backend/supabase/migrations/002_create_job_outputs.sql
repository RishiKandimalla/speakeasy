create table job_outputs (
  job_id uuid primary key references jobs(id),
  edited_video_bucket text,
  edited_video_path text,
  caption_bucket text,
  caption_path text,
  transcript_bucket text,
  transcript_path text,
  thumbnail_bucket text,
  thumbnail_path text,
  created_at timestamptz default now()
);
