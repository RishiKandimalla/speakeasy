from fastapi import HTTPException
from app.db import queries
from app.models.job import CreateJobResponse, JobStatusResponse, JobResultResponse
from app.services import storage_service

PLACEHOLDER_USER_ID = "00000000-0000-0000-0000-000000000000"


def create_job(upload_id: str, options: dict, context: dict | None) -> CreateJobResponse:
    upload = queries.get_upload(upload_id)
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")

    job = queries.create_job(
        user_id=PLACEHOLDER_USER_ID,
        upload_id=upload_id,
        options=options,
        context=context,
    )
    return CreateJobResponse(job_id=job["id"], status=job["status"], stage=job["stage"])


def get_job_status(job_id: str) -> JobStatusResponse:
    job = queries.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobStatusResponse(
        job_id=job["id"],
        status=job["status"],
        stage=job["stage"],
        progress=job["progress"],
        error_message=job.get("error_message"),
    )


def get_job_result(job_id: str) -> JobResultResponse:
    job = queries.get_job(job_id)
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
