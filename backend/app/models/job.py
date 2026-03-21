from typing import Any
from pydantic import BaseModel


class CreateJobRequest(BaseModel):
    upload_id: str
    options: dict[str, Any] = {}
    context: dict[str, Any] | None = None


class CreateJobResponse(BaseModel):
    job_id: str
    status: str
    stage: str


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    stage: str
    progress: int
    error_message: str | None = None


class JobResultResponse(BaseModel):
    job_id: str
    status: str
    assets: dict[str, Any] | None = None
    transcript: dict[str, Any] | None = None
    scores: dict[str, Any] | None = None
    metrics: dict[str, Any] | None = None
    feedback: dict[str, Any] | None = None
