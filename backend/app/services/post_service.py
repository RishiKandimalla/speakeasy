from fastapi import HTTPException
from app.db import queries
from app.models.post import PublishPostResponse, FeedPostResponse, ReactionResponse, ReactionSummaryResponse
from app.services import storage_service
from app.services.profile_service import get_or_create_profile

ALLOWED_EMOJIS = {"fire", "heart", "laugh", "clap", "mindblown", "sad"}


def publish_post(job_id: str, user_id: str) -> PublishPostResponse:
    job = queries.get_job(job_id, user_id=user_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] != "completed":
        raise HTTPException(status_code=409, detail="Job is not completed")

    existing_post = queries.get_post_by_job_id(job_id)
    if existing_post:
        queries.set_job_public(job_id, True)
        audio_url = storage_service.get_signed_url(existing_post["audio_bucket"], existing_post["audio_path"])
        return PublishPostResponse(post_id=existing_post["id"], audio_url=audio_url)

    outputs = queries.get_job_outputs(job_id) or {}
    audio_bucket = outputs.get("audio_bucket")
    audio_path = outputs.get("audio_path")
    if not audio_bucket or not audio_path:
        raise HTTPException(status_code=409, detail="Job audio output not found")

    analysis = queries.get_job_analysis(job_id) or {}
    transcript_json = analysis.get("transcript_json")

    # Ensure the user has a profile before posting
    get_or_create_profile(user_id)

    post = queries.create_post(
        job_id=job_id,
        user_id=user_id,
        audio_bucket=audio_bucket,
        audio_path=audio_path,
        transcript_json=transcript_json,
    )
    queries.set_job_public(job_id, True)

    audio_url = storage_service.get_signed_url(audio_bucket, audio_path)
    return PublishPostResponse(post_id=post["id"], audio_url=audio_url)


def _posts_to_response(posts: list[dict]) -> list[FeedPostResponse]:
    result = []
    for post in posts:
        profile = queries.get_profile(post["user_id"])
        username = profile["username"] if profile else "unknown"
        audio_url = storage_service.get_signed_url(post["audio_bucket"], post["audio_path"])
        result.append(FeedPostResponse(
            post_id=post["id"],
            username=username,
            audio_url=audio_url,
            transcript_json=post["transcript_json"] or {},
            created_at=post["created_at"],
        ))
    return result


def get_following_feed(user_id: str, limit: int = 20) -> list[FeedPostResponse]:
    posts = queries.get_following_recent_posts(user_id=user_id, limit=limit)
    return _posts_to_response(posts)


def get_discovery_feed(user_id: str, limit: int = 10) -> list[FeedPostResponse]:
    """Random recent posts, excluding own posts and already-viewed posts."""
    viewed_ids = queries.get_viewed_post_ids(user_id)
    posts = queries.get_random_recent_posts(
        limit=limit,
        exclude_user_id=user_id,
        exclude_post_ids=viewed_ids or None,
    )
    return _posts_to_response(posts)


def get_public_feed(limit: int = 20) -> list[FeedPostResponse]:
    posts = queries.get_random_public_posts(limit=limit)
    return _posts_to_response(posts)


def get_user_posts(user_id: str, limit: int = 20, offset: int = 0) -> list[FeedPostResponse]:
    posts = queries.list_user_posts(user_id=user_id, limit=limit, offset=offset)
    return _posts_to_response(posts)


def mark_viewed(user_id: str, post_id: str) -> None:
    queries.record_post_view(user_id, post_id)


def add_reaction(post_id: str, user_id: str, emoji: str, timestamp_s: float) -> ReactionResponse:
    if emoji not in ALLOWED_EMOJIS:
        raise HTTPException(status_code=422, detail=f"Invalid emoji. Allowed: {', '.join(sorted(ALLOWED_EMOJIS))}")

    post = queries.get_post(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    is_first = not queries.has_user_reacted_to_post(post_id, user_id)

    reaction = queries.create_reaction(post_id=post_id, user_id=user_id, emoji=emoji, timestamp_s=timestamp_s)

    if is_first:
        owner_id = post["user_id"]
        if owner_id != user_id:
            queries.create_notification(user_id=owner_id, post_id=post_id, emoji=emoji)

    return ReactionResponse(
        reaction_id=reaction["id"],
        post_id=post_id,
        emoji=reaction["emoji"],
        timestamp_s=reaction["timestamp_s"],
    )


def get_reaction_summary(post_id: str) -> ReactionSummaryResponse:
    post = queries.get_post(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    summary = queries.get_reaction_summary(post_id)
    return ReactionSummaryResponse(
        post_id=post_id,
        emoji_counts=summary["emoji_counts"],
        total_reactions=summary["total_reactions"],
        unique_reactors=summary["unique_reactors"],
    )
