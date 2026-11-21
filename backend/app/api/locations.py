"""구역 태그(근로자) → 위치 갱신, 근로자 현재 위치(관리자)."""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core import worker_auth
from app.core.admin_auth import require_admin
from app.core.db import get_db
from app.services import locations, zone_brief

from .schemas import CheckInRequest
from .worker import _tbm

router = APIRouter(prefix="/api", tags=["locations"])


@router.post("/w/{token}/checkin")
def checkin(token: str, body: CheckInRequest, request: Request, db: Session = Depends(get_db)):
    """QR·NFC 태그로 구역에 들어오면 호출(직접 고른 구역은 호출하지 않음). 가입 없이 보기는 401(위치 기록 안 함)."""
    w = worker_auth.require(request, db)
    t = _tbm(db, token)
    if zone_brief.find(t.assessment.draft, body.zone) is None:
        raise HTTPException(404, "구역 없음")
    c = locations.checkin(db, w, t, body.zone, body.source)
    return {"zone": c.zone, "understood": c.understood_at is not None}


@router.get("/locations", dependencies=[Depends(require_admin)])
def current_locations(db: Session = Depends(get_db)):
    return locations.snapshot(db)
