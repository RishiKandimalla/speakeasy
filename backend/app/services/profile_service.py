from coolname import generate_slug
from app.db import queries
from app.models.profile import ProfileResponse


def _generate_username(existing: set[str]) -> str:
    for _ in range(100):
        name = generate_slug(2)  # e.g. "brave-kowalski", "fluffy-nightingale"
        if name not in existing:
            return name
    raise RuntimeError("Could not generate a unique username after 100 attempts")


def get_or_create_profile(user_id: str) -> ProfileResponse:
    profile = queries.get_profile(user_id)
    if not profile:
        existing = set(queries.list_all_usernames())
        username = _generate_username(existing)
        profile = queries.create_profile(user_id, username)
    follower_count = queries.count_followers(user_id)
    following_count = queries.count_following(user_id)
    return ProfileResponse(
        user_id=profile["user_id"],
        username=profile["username"],
        follower_count=follower_count,
        following_count=following_count,
        created_at=profile["created_at"],
    )


def get_profile(user_id: str) -> ProfileResponse | None:
    profile = queries.get_profile(user_id)
    if not profile:
        return None
    follower_count = queries.count_followers(user_id)
    following_count = queries.count_following(user_id)
    return ProfileResponse(
        user_id=profile["user_id"],
        username=profile["username"],
        follower_count=follower_count,
        following_count=following_count,
        created_at=profile["created_at"],
    )


def follow(follower_id: str, following_id: str) -> None:
    queries.create_follow(follower_id, following_id)


def unfollow(follower_id: str, following_id: str) -> None:
    queries.delete_follow(follower_id, following_id)
