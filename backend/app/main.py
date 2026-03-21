from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from app.api.jobs import router as jobs_router
from app.api.uploads import router as uploads_router

app = FastAPI(title="Speakeasy Processing API")

app.include_router(jobs_router, prefix="/v1")
app.include_router(uploads_router, prefix="/v1")


@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(status_code=404, content={"detail": "Not found"})


@app.exception_handler(409)
async def conflict_handler(request: Request, exc):
    return JSONResponse(status_code=409, content={"detail": str(exc)})
