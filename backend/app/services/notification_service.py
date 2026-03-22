from app.db import queries
from app.models.notification import NotificationResponse


def list_notifications(user_id: str, limit: int = 50, offset: int = 0) -> list[NotificationResponse]:
    rows = queries.list_notifications(user_id, limit=limit, offset=offset)
    return [
        NotificationResponse(
            notification_id=row["id"],
            post_id=row["post_id"],
            type=row["type"],
            emoji=row.get("emoji"),
            read=row["read"],
            created_at=row["created_at"],
        )
        for row in rows
    ]


def mark_read(user_id: str, notification_ids: list[str]) -> None:
    if notification_ids:
        queries.mark_notifications_read(user_id, notification_ids)


def count_unread(user_id: str) -> int:
    return queries.count_unread_notifications(user_id)
