from fastapi import APIRouter
from app.models.job import CreateJobRequest, CreateJobResponse, JobStatusResponse, JobResultResponse
from app.services import job_service

router = APIRouter()


@router.post("/jobs", response_model=CreateJobResponse, status_code=201)
def create_job(body: CreateJobRequest):
    return job_service.create_job(
        upload_id=body.upload_id,
        options=body.options,
        context=body.context,
    )


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
def get_job_status(job_id: str):
    return job_service.get_job_status(job_id)


@router.get("/jobs/{job_id}/result", response_model=JobResultResponse)
def get_job_result(job_id: str):
    return job_service.get_job_result(job_id)
