from pydantic import BaseModel


class UploadResponse(BaseModel):
    upload_id: str
    status: str
    bucket: str
    path: str
