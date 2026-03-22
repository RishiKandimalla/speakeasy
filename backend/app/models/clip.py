from pydantic import BaseModel


class ClipResponse(BaseModel):
    id: str
    category: str
    duration_s: float | None = None
    file_size: int | None = None
    video_url: str
