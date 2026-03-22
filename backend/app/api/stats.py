from fastapi import APIRouter, Depends
from app.auth.deps import get_current_user_id
from app.services import stats_service

router = APIRouter()


@router.get("/stats/me")
def get_my_stats(user_id: str = Depends(get_current_user_id)):
    return stats_service.get_stats(user_id)
