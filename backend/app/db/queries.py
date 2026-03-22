from datetime import datetime, timezone
from typing import Any
from app.db.client import get_client


def _is_missing_jobs_is_public_error(exc: Exception) -> bool:
    msg = str(exc)
    missing_column = "is_public" in msg and "jobs" in msg
    # Covers both PostgREST schema-cache errors (PGRST204) and raw
    # Postgres undefined-column errors (42703).
    return missing_column and ("PGRST204" in msg or "42703" in msg or "does not exist" in msg)


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
    result = query.execute()
    return result.data[0] if result.data else None


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
    try:
        result = (
            db.table("jobs")
            .select("id, status, stage, progress, created_at, upload_id, is_public")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return result.data or []
    except Exception as exc:
        # Backward compatibility for deployments where the migration adding
        # jobs.is_public has not been applied yet.
        if not _is_missing_jobs_is_public_error(exc):
            raise
        legacy = (
            db.table("jobs")
            .select("id, status, stage, progress, created_at, upload_id")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        rows = legacy.data or []
        for row in rows:
            row["is_public"] = False
        return rows


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
    result = db.table("job_outputs").select("*").eq("job_id", job_id).execute()
    return result.data[0] if result.data else None


def get_job_analysis(job_id: str) -> dict | None:
    db = get_client()
    result = db.table("job_analysis").select("*").eq("job_id", job_id).execute()
    return result.data[0] if result.data else None


def get_upload(upload_id: str, user_id: str | None = None) -> dict | None:
    db = get_client()
    query = db.table("uploads").select("*").eq("id", upload_id)
    if user_id:
        query = query.eq("user_id", user_id)
    result = query.execute()
    return result.data[0] if result.data else None


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

    def _list_clips_from_storage(selected_category: str | None) -> list[dict]:
        categories = ["drone", "minecraft"] if not selected_category or selected_category == "both" else [selected_category]
        rows: list[dict] = []
        for cat in categories:
            objects = db.storage.from_("clips").list(path=cat, options={"limit": 500, "offset": 0})
            for obj in objects or []:
                name = obj.get("name")
                if not name or not name.lower().endswith(".mp4"):
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

    try:
        query = db.table("clips").select("*")
        if category and category != "both":
            query = query.eq("category", category)
        result = query.order("created_at", desc=True).execute()
        rows = result.data or []
        if rows:
            return rows
        # If table exists but has no data, fall back to Storage listing.
        return _list_clips_from_storage(category)
    except Exception as exc:
        # Fall back to Storage listing if clips table is missing in the current Supabase project.
        if "PGRST205" not in str(exc):
            raise
        return _list_clips_from_storage(category)


# ── Profiles ──────────────────────────────────────────────────────────────────

def get_profile(user_id: str) -> dict | None:
    db = get_client()
    result = db.table("profiles").select("*").eq("user_id", user_id).execute()
    return result.data[0] if result.data else None


def create_profile(user_id: str, username: str) -> dict:
    db = get_client()
    result = db.table("profiles").insert({"user_id": user_id, "username": username}).execute()
    return result.data[0]


def list_all_usernames() -> list[str]:
    db = get_client()
    result = db.table("profiles").select("username").execute()
    return [row["username"] for row in (result.data or [])]


def count_followers(user_id: str) -> int:
    db = get_client()
    result = db.table("follows").select("follower_id", count="exact").eq("following_id", user_id).execute()
    return result.count or 0


def count_following(user_id: str) -> int:
    db = get_client()
    result = db.table("follows").select("following_id", count="exact").eq("follower_id", user_id).execute()
    return result.count or 0


def create_follow(follower_id: str, following_id: str) -> None:
    db = get_client()
    db.table("follows").upsert({"follower_id": follower_id, "following_id": following_id}).execute()


def delete_follow(follower_id: str, following_id: str) -> None:
    db = get_client()
    db.table("follows").delete().eq("follower_id", follower_id).eq("following_id", following_id).execute()


def is_following(follower_id: str, following_id: str) -> bool:
    db = get_client()
    result = (
        db.table("follows")
        .select("follower_id")
        .eq("follower_id", follower_id)
        .eq("following_id", following_id)
        .execute()
    )
    return bool(result.data)


def list_following(user_id: str) -> list[dict]:
    """Returns profiles of everyone the user follows."""
    db = get_client()
    follows = (
        db.table("follows")
        .select("following_id")
        .eq("follower_id", user_id)
        .execute()
    )
    following_ids = [row["following_id"] for row in (follows.data or [])]
    if not following_ids:
        return []
    result = db.table("profiles").select("*").in_("user_id", following_ids).execute()
    return result.data or []


# ── Posts ─────────────────────────────────────────────────────────────────────

def create_post(job_id: str, user_id: str, audio_bucket: str, audio_path: str, transcript_json: dict | None) -> dict:
    db = get_client()
    result = db.table("posts").insert({
        "job_id": job_id,
        "user_id": user_id,
        "audio_bucket": audio_bucket,
        "audio_path": audio_path,
        "transcript_json": transcript_json,
    }).execute()
    return result.data[0]


def get_post(post_id: str) -> dict | None:
    db = get_client()
    result = db.table("posts").select("*").eq("id", post_id).execute()
    return result.data[0] if result.data else None


def get_post_by_job_id(job_id: str) -> dict | None:
    db = get_client()
    result = db.table("posts").select("*").eq("job_id", job_id).limit(1).execute()
    return result.data[0] if result.data else None


def list_user_posts(user_id: str, limit: int = 50, offset: int = 0) -> list[dict]:
    db = get_client()
    result = (
        db.table("posts")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return result.data or []


def get_following_recent_posts(user_id: str, limit: int = 20) -> list[dict]:
    """Returns recent posts from users the given user follows."""
    db = get_client()
    follows = db.table("follows").select("following_id").eq("follower_id", user_id).execute()
    following_ids = [row["following_id"] for row in (follows.data or [])]
    if not following_ids:
        return []
    result = (
        db.table("posts")
        .select("*")
        .in_("user_id", following_ids)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


def get_random_recent_posts(limit: int = 10, exclude_user_id: str | None = None, exclude_post_ids: list[str] | None = None) -> list[dict]:
    """Returns random unseen posts from the last 24 hours."""
    import random
    db = get_client()
    query = (
        db.table("posts")
        .select("*")
        .gte("created_at", "now() - interval '24 hours'")
    )
    if exclude_user_id:
        query = query.neq("user_id", exclude_user_id)
    if exclude_post_ids:
        query = query.not_.in_("id", exclude_post_ids)
    result = query.order("created_at", desc=True).limit(limit * 5).execute()
    rows = result.data or []
    random.shuffle(rows)
    return rows[:limit]


def get_random_public_posts(limit: int = 20, exclude_user_id: str | None = None, exclude_post_ids: list[str] | None = None) -> list[dict]:
    """Returns random public posts across all time.

    Public visibility is determined by jobs.is_public when available.
    """
    import random

    db = get_client()
    query = db.table("posts").select("*")
    if exclude_user_id:
        query = query.neq("user_id", exclude_user_id)
    if exclude_post_ids:
        query = query.not_.in_("id", exclude_post_ids)

    # Pull a larger recent slice, then shuffle for randomness.
    result = query.order("created_at", desc=True).limit(limit * 10).execute()
    rows = result.data or []
    if not rows:
        return []

    # Filter to posts with jobs marked public when that column exists.
    job_ids = [row["job_id"] for row in rows if row.get("job_id")]
    if job_ids:
        try:
            jobs_result = (
                db.table("jobs")
                .select("id, is_public")
                .in_("id", job_ids)
                .execute()
            )
            public_job_ids = {job["id"] for job in (jobs_result.data or []) if job.get("is_public") is True}
            rows = [row for row in rows if row.get("job_id") in public_job_ids]
        except Exception as exc:
            # Backward compatibility for deployments where jobs.is_public
            # has not been applied yet.
            if not _is_missing_jobs_is_public_error(exc):
                raise

    random.shuffle(rows)
    return rows[:limit]


def record_post_view(user_id: str, post_id: str) -> None:
    db = get_client()
    db.table("post_views").upsert({"user_id": user_id, "post_id": post_id}).execute()


def set_job_public(job_id: str, is_public: bool = True) -> None:
    db = get_client()
    try:
        db.table("jobs").update({"is_public": is_public}).eq("id", job_id).execute()
    except Exception as exc:
        # No-op for environments that have not yet migrated jobs.is_public.
        if not _is_missing_jobs_is_public_error(exc):
            raise


def get_viewed_post_ids(user_id: str) -> list[str]:
    db = get_client()
    result = db.table("post_views").select("post_id").eq("user_id", user_id).execute()
    return [row["post_id"] for row in (result.data or [])]


# ── Reactions ─────────────────────────────────────────────────────────────────

def create_reaction(post_id: str, user_id: str, emoji: str, timestamp_s: float) -> dict:
    db = get_client()
    result = db.table("post_reactions").insert({
        "post_id": post_id,
        "user_id": user_id,
        "emoji": emoji,
        "timestamp_s": timestamp_s,
    }).execute()
    return result.data[0]


# ── User stats ────────────────────────────────────────────────────────────────

def get_user_stats(user_id: str) -> dict | None:
    db = get_client()
    result = db.table("user_stats").select("*").eq("user_id", user_id).execute()
    return result.data[0] if result.data else None


def upsert_user_stats(user_id: str, stats: dict) -> None:
    db = get_client()
    db.table("user_stats").upsert({"user_id": user_id, **stats}).execute()


def count_completed_jobs_today(user_id: str) -> int:
    """Returns how many jobs the user has completed today (UTC date)."""
    db = get_client()
    result = (
        db.table("jobs")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .eq("status", "completed")
        .gte("completed_at", datetime.now(timezone.utc).date().isoformat())
        .execute()
    )
    return result.count or 0


# ── Reactions ─────────────────────────────────────────────────────────────────

def get_reactions_for_post(post_id: str) -> list[dict]:
    db = get_client()
    result = (
        db.table("post_reactions")
        .select("id, emoji, timestamp_s, created_at")
        .eq("post_id", post_id)
        .order("timestamp_s")
        .execute()
    )
    return result.data or []


def has_user_reacted_to_post(post_id: str, user_id: str) -> bool:
    db = get_client()
    result = (
        db.table("post_reactions")
        .select("id", count="exact")
        .eq("post_id", post_id)
        .eq("user_id", user_id)
        .execute()
    )
    return (result.count or 0) > 0


def get_reaction_summary(post_id: str) -> dict:
    """Returns emoji counts, total reactions, and unique reactor count for a post."""
    db = get_client()
    rows = (
        db.table("post_reactions")
        .select("emoji, user_id")
        .eq("post_id", post_id)
        .execute()
    ).data or []

    emoji_counts: dict[str, int] = {}
    unique_users: set[str] = set()
    for row in rows:
        emoji_counts[row["emoji"]] = emoji_counts.get(row["emoji"], 0) + 1
        unique_users.add(row["user_id"])

    return {
        "emoji_counts": emoji_counts,
        "total_reactions": len(rows),
        "unique_reactors": len(unique_users),
    }


# ── Notifications ─────────────────────────────────────────────────────────────

def create_notification(user_id: str, post_id: str, emoji: str | None = None) -> dict:
    db = get_client()
    result = db.table("notifications").insert({
        "user_id": user_id,
        "post_id": post_id,
        "type": "reaction",
        "emoji": emoji,
    }).execute()
    return result.data[0]


def list_notifications(user_id: str, limit: int = 50, offset: int = 0) -> list[dict]:
    db = get_client()
    result = (
        db.table("notifications")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return result.data or []


def mark_notifications_read(user_id: str, notification_ids: list[str]) -> None:
    db = get_client()
    (
        db.table("notifications")
        .update({"read": True})
        .eq("user_id", user_id)
        .in_("id", notification_ids)
        .execute()
    )


def count_unread_notifications(user_id: str) -> int:
    db = get_client()
    result = (
        db.table("notifications")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .eq("read", False)
        .execute()
    )
    return result.count or 0
