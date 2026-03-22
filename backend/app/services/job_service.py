import logging
import httpx
from fastapi import HTTPException
from app.db import queries
from app.models.job import CreateJobResponse, JobStatusResponse, JobResultResponse
from app.services import storage_service

log = logging.getLogger(__name__)

PLACEHOLDER_USER_ID = "00000000-0000-0000-0000-000000000000"
GCP_PROJECT = "speakeasy-490921"
GCP_REGION = "us-east1"
WORKER_JOB_NAME = "speakeasy-worker"


def _trigger_worker(job_id: str) -> None:
    try:
        token_resp = httpx.get(
            "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
            headers={"Metadata-Flavor": "Google"},
            timeout=5,
        )
        token = token_resp.json()["access_token"]
        httpx.post(
            f"https://run.googleapis.com/v2/projects/{GCP_PROJECT}/locations/{GCP_REGION}/jobs/{WORKER_JOB_NAME}:run",
            headers={"Authorization": f"Bearer {token}"},
            json={"overrides": {"containerOverrides": [{"env": [{"name": "JOB_ID", "value": job_id}]}]}},
            timeout=10,
        )
        log.info(f"Triggered worker for job {job_id}")
    except Exception as e:
        log.warning(f"Failed to trigger worker for job {job_id}: {e}")

def create_job(user_id: str, upload_id: str, options: dict, context: dict | None) -> CreateJobResponse:
    upload = queries.get_upload(upload_id, user_id=user_id)
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")

    job = queries.create_job(
        user_id=user_id,
        upload_id=upload_id,
        options=options,
        context=context,
    )
    _trigger_worker(job["id"])
    return CreateJobResponse(job_id=job["id"], status=job["status"], stage=job["stage"])


def get_job_status(job_id: str, user_id: str) -> JobStatusResponse:
    job = queries.get_job(job_id, user_id=user_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobStatusResponse(
        job_id=job["id"],
        status=job["status"],
        stage=job["stage"],
        progress=job["progress"],
        error_message=job.get("error_message"),
    )


def get_job_result(job_id: str, user_id: str) -> JobResultResponse:
    job = queries.get_job(job_id, user_id=user_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] != "completed":
        raise HTTPException(status_code=409, detail=f"Job is not completed (status: {job['status']})")

    outputs = queries.get_job_outputs(job_id) or {}
    analysis = queries.get_job_analysis(job_id) or {}

    assets = {}
    for asset_key, bucket_field, path_field in [
        ("edited_video", "edited_video_bucket", "edited_video_path"),
        ("captions", "caption_bucket", "caption_path"),
        ("transcript", "transcript_bucket", "transcript_path"),
        ("thumbnail", "thumbnail_bucket", "thumbnail_path"),
    ]:
        bucket = outputs.get(bucket_field)
        path = outputs.get(path_field)
        if bucket and path:
            assets[asset_key] = storage_service.get_signed_url(bucket, path)

    return JobResultResponse(
        job_id=job_id,
        status=job["status"],
        assets=assets or None,
        transcript=analysis.get("transcript_json"),
        scores=analysis.get("scores"),
        metrics=analysis.get("metrics"),
        feedback=analysis.get("feedback"),
    )
