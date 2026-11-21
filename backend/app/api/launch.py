"""홈 화면 앱 시작점 — 가장 최근 발행된 TBM 토큰 (근로자는 매일 새 QR 없이 앱만 열면 된다)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import Tbm

router = APIRouter(prefix="/api", tags=["launch"])


@router.get("/launch")
def latest(db: Session = Depends(get_db)):
    t = db.scalar(select(Tbm).order_by(Tbm.published_at.desc(), Tbm.id.desc()).limit(1))
    if not t:
        raise HTTPException(404, "발행된 TBM 없음")
    return {"token": t.token}
