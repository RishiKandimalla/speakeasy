from datetime import datetime, timezone
from typing import Any
from app.db.client import get_client


def create_job(user_id: str, upload_id: str, options: dict, context: dict | None) -> dict:
    db = get_client()
    result = (
        db.table("jobs")
        .insert({
            "user_id": user_id,
            "upload_id": upload_id,
            "options": options,
            "context": context,
        })
        .execute()
    )
    return result.data[0]


def get_job(job_id: str, user_id: str | None = None) -> dict | None:
    db = get_client()
    query = db.table("jobs").select("*").eq("id", job_id)
    if user_id:
        query = query.eq("user_id", user_id)
    result = query.maybe_single().execute()
    return result.data


def claim_job(job_id: str, worker_name: str) -> bool:
    db = get_client()
    result = (
        db.table("jobs")
        .update({
            "status": "processing",
            "claimed_by": worker_name,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "attempt_count": get_job(job_id)["attempt_count"] + 1,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        .eq("id", job_id)
        .eq("status", "queued")
        .execute()
    )
    return len(result.data) == 1


def update_job_stage(job_id: str, stage: str, progress: int) -> None:
    db = get_client()
    db.table("jobs").update({
        "stage": stage,
        "progress": progress,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", job_id).execute()


def mark_job_failed(job_id: str, error_message: str) -> None:
    db = get_client()
    db.table("jobs").update({
        "status": "failed",
        "error_message": error_message,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", job_id).execute()


def mark_job_completed(job_id: str) -> None:
    db = get_client()
    db.table("jobs").update({
        "status": "completed",
        "stage": "completed",
        "progress": 100,
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", job_id).execute()


def list_jobs(user_id: str, limit: int = 20, offset: int = 0) -> list[dict]:
    db = get_client()
    result = (
        db.table("jobs")
        .select("id, status, stage, progress, created_at, upload_id")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return result.data or []


def find_next_queued_job() -> dict | None:
    db = get_client()
    result = (
        db.table("jobs")
        .select("*")
        .eq("status", "queued")
        .order("created_at")
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def upsert_job_outputs(job_id: str, outputs: dict) -> None:
    db = get_client()
    db.table("job_outputs").upsert({"job_id": job_id, **outputs}).execute()


def upsert_job_analysis(job_id: str, analysis: dict) -> None:
    db = get_client()
    db.table("job_analysis").upsert({"job_id": job_id, **analysis}).execute()


def get_job_outputs(job_id: str) -> dict | None:
    db = get_client()
    result = db.table("job_outputs").select("*").eq("job_id", job_id).maybe_single().execute()
    return result.data if result else None


def get_job_analysis(job_id: str) -> dict | None:
    db = get_client()
    result = db.table("job_analysis").select("*").eq("job_id", job_id).maybe_single().execute()
    return result.data if result else None


def get_upload(upload_id: str, user_id: str | None = None) -> dict | None:
    db = get_client()
    query = db.table("uploads").select("*").eq("id", upload_id)
    if user_id:
        query = query.eq("user_id", user_id)
    result = query.maybe_single().execute()
    return result.data


def list_uploads(user_id: str, limit: int = 50) -> list[dict]:
    db = get_client()
    result = (
        db.table("uploads")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


def create_upload(user_id: str, bucket: str, path: str, filename: str | None, content_type: str | None, file_size: int | None) -> dict:
    db = get_client()
    result = (
        db.table("uploads")
        .insert({
            "user_id": user_id,
            "bucket": bucket,
            "path": path,
            "filename": filename,
            "content_type": content_type,
            "file_size": file_size,
        })
        .execute()
    )
    return result.data[0]


def update_upload_status(upload_id: str, status: str) -> None:
    db = get_client()
    db.table("uploads").update({"status": status}).eq("id", upload_id).execute()


def list_clips(category: str | None = None) -> list[dict]:
    db = get_client()
    try:
        query = db.table("clips").select("*")
        if category and category != "both":
            query = query.eq("category", category)
        result = query.order("created_at", desc=True).execute()
        return result.data or []
    except Exception as exc:
        # Fall back to Storage listing if clips table is missing in the current Supabase project.
        if "PGRST205" not in str(exc):
            raise

        categories = ["drone", "minecraft"] if not category or category == "both" else [category]
        rows: list[dict] = []
        for cat in categories:
            objects = db.storage.from_("clips").list(path=cat, options={"limit": 500, "offset": 0})
            for obj in objects or []:
                name = obj.get("name")
                if not name:
                    continue
                metadata = obj.get("metadata") or {}
                size = metadata.get("size")
                rows.append(
                    {
                        "id": f"{cat}/{name}",
                        "bucket": "clips",
                        "path": f"{cat}/{name}",
                        "category": cat,
                        "duration_s": None,
                        "file_size": int(size) if size is not None else None,
                    }
                )
        return rows
