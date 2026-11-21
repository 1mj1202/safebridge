"""관리자 잠금 — SAFEBRIDGE_ADMIN_PASSWORD 가 있으면 관리자 API 는 로그인 쿠키가 있어야 한다.

근로자 화면(/api/w/*, /api/launch)과 읽기 전용 참고 자료(3D 모델·사고사례 등)는 그대로 열어 둔다.
쿠키에는 비밀번호 자체가 아니라 비밀번호로 만든 서명값만 넣는다.
"""
from __future__ import annotations

import hashlib
import hmac

from fastapi import HTTPException, Request

from .config import get_settings

COOKIE = "sb_admin"


def required() -> bool:
    return bool(get_settings().admin_password)


def make_token(password: str) -> str:
    return hmac.new(password.encode(), b"safebridge-admin-v1", hashlib.sha256).hexdigest()


def check_password(password: str) -> bool:
    pw = get_settings().admin_password
    return bool(pw) and hmac.compare_digest(password.encode(), pw.encode())


def is_admin(request: Request) -> bool:
    if not required():
        return True
    got = request.cookies.get(COOKIE, "")
    return hmac.compare_digest(got, make_token(get_settings().admin_password))


def require_admin(request: Request) -> None:
    """관리자 라우터에 거는 의존성."""
    if not is_admin(request):
        raise HTTPException(401, "관리자 로그인이 필요합니다")
