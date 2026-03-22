from fastapi import APIRouter, Depends, Query
from app.auth.deps import get_current_user_id
from app.models.post import (
    PublishPostResponse,
    FeedPostResponse,
    OwnerReactionsSummaryResponse,
    ReactionRequest,
    ReactionResponse,
    PostReactionsResponse,
    ReactionSummaryResponse,
)
from app.services import post_service

router = APIRouter()


@router.post("/jobs/{job_id}/publish", response_model=PublishPostResponse, status_code=201)
def publish_post(job_id: str, user_id: str = Depends(get_current_user_id)):
    return post_service.publish_post(job_id=job_id, user_id=user_id)


@router.get("/feed/following", response_model=list[FeedPostResponse])
def get_following_feed(
    limit: int = Query(default=20, ge=1, le=50),
    user_id: str = Depends(get_current_user_id),
):
    return post_service.get_following_feed(user_id=user_id, limit=limit)


@router.get("/feed/discover", response_model=list[FeedPostResponse])
def get_discovery_feed(
    limit: int = Query(default=10, ge=1, le=50),
    user_id: str = Depends(get_current_user_id),
):
    return post_service.get_discovery_feed(user_id=user_id, limit=limit)


@router.get("/feed/public", response_model=list[FeedPostResponse])
def get_public_feed(
    limit: int = Query(default=20, ge=1, le=100),
):
    return post_service.get_public_feed(limit=limit)


@router.post("/posts/{post_id}/view", status_code=204)
def mark_viewed(post_id: str, user_id: str = Depends(get_current_user_id)):
    post_service.mark_viewed(user_id=user_id, post_id=post_id)


@router.get("/posts/{post_id}/reactions/summary", response_model=ReactionSummaryResponse)
def get_reaction_summary(post_id: str):
    """Public: counts do not expose reactor identity."""
    return post_service.get_reaction_summary(post_id)


@router.get("/posts/{post_id}/reactions", response_model=PostReactionsResponse)
def get_reactions(post_id: str):
    from app.db import queries
    reactions = queries.get_reactions_for_post(post_id)
    return PostReactionsResponse(
        post_id=post_id,
        reactions=[
            ReactionResponse(
                reaction_id=r["id"],
                post_id=post_id,
                emoji=r["emoji"],
                timestamp_s=r["timestamp_s"],
            )
            for r in reactions
        ],
    )


@router.post("/posts/{post_id}/reactions", response_model=ReactionResponse, status_code=201)
def add_reaction(
    post_id: str,
    body: ReactionRequest,
    user_id: str = Depends(get_current_user_id),
):
    return post_service.add_reaction(
        post_id=post_id,
        user_id=user_id,
        emoji=body.emoji,
        timestamp_s=body.timestamp_s,
    )


@router.get("/reactions/me/summary", response_model=OwnerReactionsSummaryResponse)
def get_my_reactions_summary(user_id: str = Depends(get_current_user_id)):
    """Correct totals and distinct reactors across all of the user's posts."""
    return post_service.get_owner_reactions_summary(user_id)


@router.get("/reactions/me", response_model=list[ReactionResponse])
def get_my_reactions(
    limit: int = Query(default=500, ge=1, le=2000),
    offset: int = Query(default=0, ge=0),
    user_id: str = Depends(get_current_user_id),
):
    from app.db import queries
    rows = queries.get_all_reactions_for_user(user_id, limit=limit, offset=offset)
    return [
        ReactionResponse(
            reaction_id=r["id"],
            post_id=r["post_id"],
            emoji=r["emoji"],
            timestamp_s=r["timestamp_s"],
        )
        for r in rows
    ]
