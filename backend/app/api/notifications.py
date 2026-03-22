from fastapi import APIRouter, Depends, Query
from app.auth.deps import get_current_user_id
from app.models.notification import NotificationResponse, MarkReadRequest, UnreadCountResponse
from app.services import notification_service

router = APIRouter()


@router.get("/notifications", response_model=list[NotificationResponse])
def list_notifications(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user_id: str = Depends(get_current_user_id),
):
    return notification_service.list_notifications(user_id, limit=limit, offset=offset)


@router.post("/notifications/read", status_code=204)
def mark_read(body: MarkReadRequest, user_id: str = Depends(get_current_user_id)):
    notification_service.mark_read(user_id, body.notification_ids)


@router.get("/notifications/unread-count", response_model=UnreadCountResponse)
def unread_count(user_id: str = Depends(get_current_user_id)):
    return UnreadCountResponse(count=notification_service.count_unread(user_id))
