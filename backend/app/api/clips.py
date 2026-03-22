from typing import Literal
from fastapi import APIRouter, Query
from app.db import queries
from app.models.clip import ClipResponse
from app.services import storage_service

router = APIRouter()


@router.get("/clips", response_model=list[ClipResponse])
def list_clips(category: Literal["minecraft", "drone", "both"] = Query(default="both")):
    rows = queries.list_clips(category=category)
    items: list[ClipResponse] = []
    for row in rows:
        bucket = row.get("bucket") or "clips"
        path = row["path"]
        video_url = storage_service.get_signed_url(bucket, path)
        items.append(
            ClipResponse(
                id=row["id"],
                category=row["category"],
                duration_s=row.get("duration_s"),
                file_size=row.get("file_size"),
                video_url=video_url,
            )
        )
    return items
