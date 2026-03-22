from fastapi import APIRouter, Depends
from app.auth.deps import get_current_user_id
from app.models.job import CreateJobRequest, CreateJobResponse, JobStatusResponse, JobResultResponse
from app.services import job_service

router = APIRouter()


@router.post("/jobs", response_model=CreateJobResponse, status_code=201)
def create_job(body: CreateJobRequest, user_id: str = Depends(get_current_user_id)):
    return job_service.create_job(
        user_id=user_id,
        upload_id=body.upload_id,
        options=body.options,
        context=body.context,
    )


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
def get_job_status(job_id: str, user_id: str = Depends(get_current_user_id)):
    return job_service.get_job_status(job_id, user_id=user_id)


@router.get("/jobs/{job_id}/result", response_model=JobResultResponse)
def get_job_result(job_id: str, user_id: str = Depends(get_current_user_id)):
    return job_service.get_job_result(job_id, user_id=user_id)
