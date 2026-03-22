from datetime import datetime
from pydantic import BaseModel


class ProfileResponse(BaseModel):
    user_id: str
    username: str
    follower_count: int
    following_count: int
    created_at: datetime
