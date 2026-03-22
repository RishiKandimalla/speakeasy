import logging
import os
import shutil
import tempfile
from dotenv import load_dotenv

load_dotenv()

from app.db import queries
from app.services import storage_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)


def process_job(job_id: str) -> None:
    tmp_dir = tempfile.mkdtemp(prefix=f"job_{job_id}_")
    try:
        queries.update_job_stage(job_id, "downloading", 10)
        job = queries.get_job(job_id)
        upload = queries.get_upload(job["upload_id"])
        if not upload:
            raise ValueError(f"Upload {job['upload_id']} not found")

        local_video_path = os.path.join(tmp_dir, "video" + os.path.splitext(upload["path"])[1])
        storage_service.download_video(upload["bucket"], upload["path"], local_video_path)
        log.info(f"Downloaded video to {local_video_path}")

        queries.update_job_stage(job_id, "uploading_outputs", 80)
        output_bucket = "outputs"
        output_path = f"{job_id}/video{os.path.splitext(upload['path'])[1]}"
        storage_service.upload_file(output_bucket, output_path, local_video_path)
        log.info(f"Uploaded output to {output_bucket}/{output_path}")

        queries.upsert_job_outputs(job_id, {
            "edited_video_bucket": output_bucket,
            "edited_video_path": output_path,
        })

        queries.mark_job_completed(job_id)
        log.info(f"Job {job_id} completed")
    except Exception as e:
        log.error(f"Job {job_id} failed: {e}")
        queries.mark_job_failed(job_id, str(e))
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


if __name__ == "__main__":
    job_id = os.environ.get("JOB_ID")
    if not job_id:
        log.error("JOB_ID env var not set")
        exit(1)
    log.info(f"Processing job {job_id}")
    process_job(job_id)
