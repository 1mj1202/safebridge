"""관리자 잠금 — SAFEBRIDGE_ADMIN_PASSWORD 가 있으면 관리자 API 는 로그인 쿠키가 있어야 한다.

근로자 화면(/api/w/*, /api/launch)과 읽기 전용 참고 자료(3D 모델·사고사례 등)는 그대로 열어 둔다.
쿠키에는 비밀번호가 아니라 무작위 세션값만 넣고, 세션은 오래 안 쓰면 끝난다(admin_sessions).
"""
from __future__ import annotations

import hmac

from fastapi import HTTPException, Request

from . import admin_sessions
from .config import get_settings

COOKIE = "sb_admin"


def required() -> bool:
    return bool(get_settings().admin_password)


def check_password(password: str) -> bool:
    pw = get_settings().admin_password
    return bool(pw) and hmac.compare_digest(password.encode(), pw.encode())


def session_id(request: Request) -> str:
    return request.cookies.get(COOKIE, "")


def is_admin(request: Request) -> bool:
    if not required():
        return True
    return admin_sessions.valid(session_id(request))


def require_admin(request: Request) -> None:
    """관리자 라우터에 거는 의존성. 확인만 하고 세션을 늘리지 않는다(자동 새로고침 때문)."""
    if not is_admin(request):
        raise HTTPException(401, "관리자 로그인이 필요합니다")
