"""관리자 쪽 로그인 세션 — 마지막 사용 시각부터 admin_idle_minutes 가 지나면 끝난다.

세션은 DB(staff_sessions)에 두어 서버를 다시 켜도 유지된다. 쿠키에는 무작위 세션값만 들어간다.
연장은 화면을 실제로 쓸 때(로그인, /api/admin/touch)만 한다.
관리자 화면이 15초마다 하는 자동 새로고침 요청은 세션을 늘리지 않는다 → 켜 두기만 하면 만료된다.
"""
from __future__ import annotations

import secrets
import time

from sqlalchemy import delete

from .config import get_settings
from .db import SessionLocal


def idle_seconds() -> int:
    return max(1, get_settings().admin_idle_minutes) * 60


def _model():
    from app.models.staff import StaffSession

    return StaffSession


def create(role: str) -> str:
    M = _model()
    sid = secrets.token_urlsafe(32)
    now = time.time()
    with SessionLocal() as db:
        db.execute(delete(M).where(M.last_used < now - idle_seconds()))  # 끝난 세션 정리
        db.add(M(sid=sid, role=role, last_used=now))
        db.commit()
    return sid


def role(sid: str) -> str | None:
    """살아 있으면 부류를 돌려준다(연장하지 않음). 끝났으면 지운다."""
    if not sid:
        return None
    M = _model()
    with SessionLocal() as db:
        s = db.get(M, sid)
        if s is None:
            return None
        if time.time() - s.last_used > idle_seconds():
            db.delete(s)
            db.commit()
            return None
        return s.role


def valid(sid: str) -> bool:
    return role(sid) is not None


def touch(sid: str) -> bool:
    """화면을 실제로 썼을 때 — 살아 있으면 마지막 사용 시각을 지금으로."""
    if role(sid) is None:
        return False
    M = _model()
    with SessionLocal() as db:
        s = db.get(M, sid)
        if s is None:
            return False
        s.last_used = time.time()
        db.commit()
    return True


def drop(sid: str) -> None:
    if not sid:
        return
    M = _model()
    with SessionLocal() as db:
        db.execute(delete(M).where(M.sid == sid))
        db.commit()


def _age_for_test(sid: str, seconds: float) -> None:
    """테스트용: 세션을 seconds 만큼 오래된 것으로 만든다."""
    M = _model()
    with SessionLocal() as db:
        s = db.get(M, sid)
        if s:
            s.last_used -= seconds
            db.commit()
