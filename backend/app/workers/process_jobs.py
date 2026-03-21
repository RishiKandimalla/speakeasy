import asyncio
import logging
import os
import shutil
import tempfile
from time import sleep
from dotenv import load_dotenv

load_dotenv()

from app.db import queries
from app.services import (
    storage_service,
    transcript_service,
    analysis_service,
    feedback_service,
    presage_service,
    captions_service,
    render_service,
)

WORKER_NAME = os.environ.get("WORKER_NAME", "worker-1")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)


async def _run_pipeline(job_id: str, tmp_dir: str) -> None:
    # Stage: Load job + upload
    queries.update_job_stage(job_id, "downloading", 5)
    job = queries.get_job(job_id)
    upload = queries.get_upload(job["upload_id"])
    if not upload:
        raise ValueError(f"Upload {job['upload_id']} not found")

    # Stage: Download video
    queries.update_job_stage(job_id, "inspecting", 10)
    video_bucket = upload.get("bucket")
    video_path = upload.get("path")
    local_video_path = os.path.join(tmp_dir, "video.mp4")
    storage_service.download_video(video_bucket, video_path, local_video_path)

    # Stage: Inspect media
    queries.update_job_stage(job_id, "extracting_audio", 15)
    # TODO: run ffprobe subprocess

    # Stage: Extract audio
    queries.update_job_stage(job_id, "transcribing", 20)
    local_audio_path = os.path.join(tmp_dir, "audio.wav")
    # TODO: run ffmpeg subprocess to extract audio

    # Stage: Transcribe
    queries.update_job_stage(job_id, "analyzing", 35)
    transcript = await transcript_service.transcribe(local_audio_path)

    # Stage: Analyze
    queries.update_job_stage(job_id, "generating_feedback", 55)
    metrics = analysis_service.analyze(transcript)

    # Stage: Feedback
    queries.update_job_stage(job_id, "generating_captions", 70)
    context = job.get("context") or {}
    feedback = await feedback_service.generate_feedback(transcript, metrics, context)

    # Stage: Presage (non-fatal)
    presage_result = None
    try:
        presage_result = await presage_service.run_presage(local_video_path)
    except NotImplementedError:
        log.warning("Presage not implemented, skipping")
    except Exception as e:
        log.warning(f"Presage failed (non-fatal): {e}")

    # Stage: Captions
    queries.update_job_stage(job_id, "rendering", 80)
    captions_srt = captions_service.generate_captions(transcript)
    local_captions_path = os.path.join(tmp_dir, "captions.srt")
    with open(local_captions_path, "w") as f:
        f.write(captions_srt)

    # Stage: Render
    queries.update_job_stage(job_id, "uploading_outputs", 90)
    options = job.get("options") or {}
    render_result = render_service.render(local_video_path, local_captions_path, options)

    # Stage: Upload outputs
    output_video_path = render_result.get("video_path")
    output_thumbnail_path = render_result.get("thumbnail_path")
    output_bucket = "outputs"

    storage_service.upload_file(output_bucket, f"{job_id}/video.mp4", output_video_path)
    storage_service.upload_file(output_bucket, f"{job_id}/thumbnail.jpg", output_thumbnail_path)
    storage_service.upload_file(output_bucket, f"{job_id}/captions.srt", local_captions_path)

    # Stage: Save results
    queries.upsert_job_outputs(job_id, {
        "edited_video_bucket": output_bucket,
        "edited_video_path": f"{job_id}/video.mp4",
        "caption_bucket": output_bucket,
        "caption_path": f"{job_id}/captions.srt",
        "thumbnail_bucket": output_bucket,
        "thumbnail_path": f"{job_id}/thumbnail.jpg",
    })
    queries.upsert_job_analysis(job_id, {
        "transcript_text": transcript.get("text"),
        "transcript_json": transcript,
        "scores": feedback.get("scores"),
        "metrics": metrics,
        "feedback": feedback.get("coaching"),
        "presage": presage_result,
    })

    queries.update_job_stage(job_id, "completed", 100)
    queries.mark_job_completed(job_id)
    log.info(f"Job {job_id} completed")


async def process_job(job_id: str) -> None:
    tmp_dir = tempfile.mkdtemp(prefix=f"job_{job_id}_")
    try:
        await _run_pipeline(job_id, tmp_dir)
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


async def run_worker() -> None:
    log.info(f"Worker {WORKER_NAME} started")
    while True:
        job = queries.find_next_queued_job()
        if not job:
            sleep(2)
            continue

        job_id = job["id"]
        claimed = queries.claim_job(job_id, WORKER_NAME)
        if not claimed:
            log.debug(f"Job {job_id} already claimed, skipping")
            continue

        log.info(f"Processing job {job_id}")
        try:
            await process_job(job_id)
        except Exception as e:
            log.error(f"Job {job_id} failed: {e}")
            queries.mark_job_failed(job_id, str(e))


if __name__ == "__main__":
    asyncio.run(run_worker())
