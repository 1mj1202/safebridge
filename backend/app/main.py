"""SafeBridge API 진입점."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.api import assessments, bim, reference, worker
from app.core.config import get_settings
from app.core.db import init_db

logging.basicConfig(level=logging.INFO)



@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(title="SafeBridge API", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=get_settings().cors_origins, allow_methods=["*"],
                   allow_headers=["*"])
app.add_middleware(GZipMiddleware, minimum_size=2048)
for r in (bim.router, reference.router, assessments.router, worker.router):
    app.include_router(r)


@app.get("/api/health")
def health():
    return {"ok": True}
