"""SafeBridge API 진입점."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.api import assessments, bim, field, issues, reference, worker
from app.core.config import get_settings
from app.core.db import init_db
from app.services import bim as bim_service

logging.basicConfig(level=logging.INFO)



@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    bim_service.get_model()  # 요청 받기 전에 IFC 를 미리 읽어 둔다
    yield


app = FastAPI(title="SafeBridge API", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=get_settings().cors_origins, allow_methods=["*"],
                   allow_headers=["*"])
app.add_middleware(GZipMiddleware, minimum_size=2048)
for r in (bim.router, reference.router, assessments.router, field.router, issues.router, worker.router):
    app.include_router(r)


@app.get("/api/health")
def health():
    return {"ok": True}
