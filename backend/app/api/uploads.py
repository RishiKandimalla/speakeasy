import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from app.auth.deps import get_current_user_id
from app.db import queries
from app.models.upload import UploadResponse
from app.services import storage_service

router = APIRouter()

UPLOAD_BUCKET = "uploads"


def _row_to_response(row: dict) -> UploadResponse:
    video_url = storage_service.get_signed_url(row["bucket"], row["path"])
    return UploadResponse(
        upload_id=row["id"],
        status=row["status"],
        bucket=row["bucket"],
        path=row["path"],
        video_url=video_url,
    )


@router.get("/uploads", response_model=list[UploadResponse])
def list_uploads(user_id: str = Depends(get_current_user_id)):
    rows = queries.list_uploads(user_id=user_id, limit=50)
    return [_row_to_response(row) for row in rows]


@router.post("/uploads", response_model=UploadResponse, status_code=201)
async def create_upload(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    upload_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename or "")[1]
    path = f"uploads/{upload_id}/original{ext}"

    data = await file.read()

    storage_service.upload_from_bytes(UPLOAD_BUCKET, path, data, file.content_type or "application/octet-stream")

    row = queries.create_upload(
        user_id=user_id,
        bucket=UPLOAD_BUCKET,
        path=path,
        filename=file.filename,
        content_type=file.content_type,
        file_size=len(data),
    )

    return UploadResponse(
        upload_id=row["id"],
        status=row["status"],
        bucket=row["bucket"],
        path=row["path"],
    )


@router.get("/uploads/{upload_id}", response_model=UploadResponse)
async def get_upload(upload_id: str, user_id: str = Depends(get_current_user_id)):
    row = queries.get_upload(upload_id, user_id=user_id)
    if not row:
        raise HTTPException(status_code=404, detail="Upload not found")
    return _row_to_response(row)
