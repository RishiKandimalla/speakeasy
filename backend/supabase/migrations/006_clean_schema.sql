-- job_outputs: add audio columns, drop unused asset columns
ALTER TABLE job_outputs
  ADD COLUMN IF NOT EXISTS audio_bucket text,
  ADD COLUMN IF NOT EXISTS audio_path text;

ALTER TABLE job_outputs
  DROP COLUMN IF EXISTS caption_bucket,
  DROP COLUMN IF EXISTS caption_path,
  DROP COLUMN IF EXISTS transcript_bucket,
  DROP COLUMN IF EXISTS transcript_path,
  DROP COLUMN IF EXISTS thumbnail_bucket,
  DROP COLUMN IF EXISTS thumbnail_path;

-- job_analysis: drop unused columns
ALTER TABLE job_analysis
  DROP COLUMN IF EXISTS presage,
  DROP COLUMN IF EXISTS debug;
