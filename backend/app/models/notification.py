from datetime import datetime
from pydantic import BaseModel


class NotificationResponse(BaseModel):
    notification_id: str
    post_id: str
    type: str
    emoji: str | None
    read: bool
    created_at: datetime


class MarkReadRequest(BaseModel):
    notification_ids: list[str]


class UnreadCountResponse(BaseModel):
    count: int
