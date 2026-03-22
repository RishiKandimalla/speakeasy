from datetime import datetime
from typing import Any
from pydantic import BaseModel


class PublishPostResponse(BaseModel):
    post_id: str
    audio_url: str


class FeedPostResponse(BaseModel):
    post_id: str
    username: str
    audio_url: str
    transcript_json: dict[str, Any]  # includes word-level timing
    created_at: datetime


class ReactionRequest(BaseModel):
    emoji: str
    timestamp_s: float


class ReactionResponse(BaseModel):
    reaction_id: str
    post_id: str
    emoji: str
    timestamp_s: float


class PostReactionsResponse(BaseModel):
    post_id: str
    reactions: list[ReactionResponse]


class ReactionSummaryResponse(BaseModel):
    post_id: str
    emoji_counts: dict[str, int]
    total_reactions: int
    unique_reactors: int


class OwnerReactionsSummaryResponse(BaseModel):
    """Aggregated reaction stats across all posts owned by the user."""

    emoji_counts: dict[str, int]
    total_reactions: int
    unique_reactors: int
