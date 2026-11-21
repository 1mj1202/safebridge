"""근로자 위치 = 마지막으로 태그한 구역. 관리자 화면은 이 표를 15초마다 다시 읽는다."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import CheckIn, Tbm, Worker
from app.services import site

FRESH = timedelta(hours=4)  # 이보다 오래된 태그는 '오래됨'(인원 수에서 뺀다)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _utc(d: datetime | None) -> datetime | None:
    if d is None:
        return None
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)  # SQLite 는 시간대를 지운다


TAG_SOURCES = ("qr", "nfc")


def last(db: Session, w: Worker) -> CheckIn | None:
    """마지막 QR·NFC 태그. 예전(PR #24)에 '직접 선택'(pick)으로 남은 기록은 위치로 치지 않는다."""
    c = db.get(CheckIn, w.last_checkin_id) if w.last_checkin_id else None
    return c if c and c.source in TAG_SOURCES else None


def checkin(db: Session, w: Worker, t: Tbm, zone: str, source: str) -> CheckIn:
    """같은 TBM·같은 구역을 다시 태그하면 시각만 갱신 (이해 확인은 유지)."""
    c = last(db, w)
    if c and c.tbm_id == t.id and c.zone == zone:
        c.seen_at = _now()
        c.source = source
    else:
        c = CheckIn(worker_id=w.id, tbm_id=t.id, zone=zone, source=source)
        db.add(c)
        db.flush()
        w.last_checkin_id = c.id
    db.commit()
    return c


def mark_understood(db: Session, w: Worker, t: Tbm, zone: str) -> bool:
    c = db.scalar(select(CheckIn).where(CheckIn.worker_id == w.id, CheckIn.tbm_id == t.id, CheckIn.zone == zone)
                  .order_by(CheckIn.id.desc()).limit(1))
    if c is None:
        return False
    if c.understood_at is None:
        c.understood_at = _now()
        db.commit()
    return True


def snapshot(db: Session) -> dict:
    """관리자용: 근로자별 마지막 위치 + 구역 3D 상자(인원 배지 위치)."""
    now = _now()
    rows, boxes = [], {}
    for w in db.scalars(select(Worker).order_by(Worker.company, Worker.name)):
        c = last(db, w)
        at = _utc(c.seen_at) if c else None
        rows.append({"id": w.id, "name": w.name, "company": w.company, "team": w.team, "lang": w.lang,
                     "zone": c.zone if c else None, "source": c.source if c else None,
                     "at": at.isoformat() if at else None,
                     "minutes": int((now - at).total_seconds() // 60) if at else None,
                     "fresh": bool(at and now - at <= FRESH),
                     "understood": bool(c and c.understood_at)})
        if c and c.zone not in boxes:
            boxes[c.zone] = site.zone_box(c.zone)
    return {"now": now.isoformat(), "fresh_hours": int(FRESH.total_seconds() // 3600), "workers": rows, "boxes": boxes}
