"""한 서버 배포용: 빌드된 프런트엔드(dist)를 API 와 같은 주소에서 내보낸다.

SAFEBRIDGE_WEB_DIST 가 비어 있거나 폴더가 없으면 아무것도 하지 않는다
(로컬 개발은 Vite, docker compose 는 nginx 가 화면을 맡는다).
"""
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles


def mount_spa(app: FastAPI, dist: Path | None) -> bool:
    if not dist or not (dist / "index.html").is_file():
        return False
    dist = dist.resolve()
    index = dist / "index.html"
    if (dist / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        if path.startswith("api/"):
            raise HTTPException(404)
        f = (dist / path).resolve()
        if path and f.is_file() and f.is_relative_to(dist):
            return FileResponse(f)
        return FileResponse(index)  # /w/<토큰> 등 SPA 경로

    return True
