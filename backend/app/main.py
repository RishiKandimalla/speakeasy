from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.clips import router as clips_router
from app.api.jobs import router as jobs_router
from app.api.notifications import router as notifications_router
from app.api.posts import router as posts_router
from app.api.profiles import router as profiles_router
from app.api.stats import router as stats_router
from app.api.uploads import router as uploads_router

app = FastAPI(title="Speakeasy Processing API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs_router, prefix="/v1")
app.include_router(uploads_router, prefix="/v1")
app.include_router(clips_router, prefix="/v1")
app.include_router(posts_router, prefix="/v1")
app.include_router(profiles_router, prefix="/v1")
app.include_router(stats_router, prefix="/v1")
app.include_router(notifications_router, prefix="/v1")


@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(status_code=404, content={"detail": "Not found"})


@app.exception_handler(409)
async def conflict_handler(request: Request, exc):
    return JSONResponse(status_code=409, content={"detail": str(exc)})
