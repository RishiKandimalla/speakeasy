from fastapi import APIRouter, Depends, HTTPException
from app.auth.deps import get_current_user_id
from app.db import queries
from app.models.post import FeedPostResponse
from app.models.profile import ProfileResponse
from app.services import post_service, profile_service

router = APIRouter()


@router.get("/profile/me", response_model=ProfileResponse)
def get_my_profile(user_id: str = Depends(get_current_user_id)):
    return profile_service.get_or_create_profile(user_id)


@router.get("/profile/{user_id}", response_model=ProfileResponse)
def get_profile(user_id: str):
    profile = profile_service.get_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.get("/profile/{user_id}/posts", response_model=list[FeedPostResponse])
def get_profile_posts(
    user_id: str,
    limit: int = 20,
    _: str = Depends(get_current_user_id),
):
    return post_service.get_user_posts(user_id=user_id, limit=limit)


@router.post("/profile/{user_id}/follow", status_code=204)
def follow(user_id: str, current_user_id: str = Depends(get_current_user_id)):
    if user_id == current_user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    profile_service.get_or_create_profile(current_user_id)
    profile_service.follow(follower_id=current_user_id, following_id=user_id)


@router.delete("/profile/{user_id}/follow", status_code=204)
def unfollow(user_id: str, current_user_id: str = Depends(get_current_user_id)):
    profile_service.unfollow(follower_id=current_user_id, following_id=user_id)


@router.get("/profile/me/following", response_model=list[ProfileResponse])
def list_following(current_user_id: str = Depends(get_current_user_id)):
    profiles = queries.list_following(current_user_id)
    return [
        ProfileResponse(
            user_id=p["user_id"],
            username=p["username"],
            follower_count=queries.count_followers(p["user_id"]),
            following_count=queries.count_following(p["user_id"]),
            created_at=p["created_at"],
        )
        for p in profiles
    ]
