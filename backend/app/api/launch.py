"""홈 화면 앱 시작점 — 근로자가 읽을 발행본 (근로자는 매일 새 QR 없이 앱만 열면 된다).

고르는 순서: 오늘 작업일의 최신 발행본 → 오늘 이후 가장 가까운 작업일의 최신 발행본 → 가장 최근 발행본.
관리자 화면도 같은 발행본을 기본으로 열어, 두 화면이 같은 승인본을 보게 한다.
"""
from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import clock
from app.core.db import get_db
from app.models import Assessment, Tbm

router = APIRouter(prefix="/api", tags=["launch"])


def iso_utc(dt) -> str | None:
    """DB(sqlite)는 시간대 없이 돌려주므로 UTC 로 붙여 내보낸다 (화면에서 한국 시각으로 바꾼다)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def current_tbm(db: Session) -> Tbm | None:
    today = clock.today().isoformat()
    rows = db.execute(select(Tbm, Assessment.work_date).join(Assessment, Tbm.assessment_id == Assessment.id)
                      .order_by(Tbm.published_at.desc(), Tbm.id.desc())).all()
    if not rows:
        return None
    same = [t for t, d in rows if d == today]
    if same:
        return same[0]
    ahead = sorted({d for _, d in rows if d > today})
    if ahead:
        return next(t for t, d in rows if d == ahead[0])
    return rows[0][0]


def stamp(t: Tbm) -> dict:
    a = t.assessment
    return {"tbm_id": t.id, "assessment_id": a.id, "work_date": a.work_date,
            "approved_at": iso_utc(a.approved_at), "published_at": iso_utc(t.published_at)}


@router.get("/launch")
def latest(db: Session = Depends(get_db)):
    t = current_tbm(db)
    if not t:
        raise HTTPException(404, "발행된 TBM 없음")
    return {"token": t.token, **stamp(t)}
