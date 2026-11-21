"""관리자 쪽 잠금 — 비밀번호(부류별)가 하나라도 있으면 관리자 API 는 로그인 쿠키가 있어야 한다.

근로자 화면(/api/w/*, /api/launch)과 읽기 전용 참고 자료(3D 모델·사고사례 등)는 그대로 열어 둔다.
쿠키에는 비밀번호가 아니라 무작위 세션값만 넣고, 세션은 오래 안 쓰면 끝난다(admin_sessions).
부류별로 할 수 있는 일은 roles.py 가 정한다.
"""
from __future__ import annotations

from fastapi import HTTPException, Request

from . import admin_sessions, roles

COOKIE = "sb_admin"


def required() -> bool:
    return bool(roles.enabled())


def session_id(request: Request) -> str:
    return request.cookies.get(COOKIE, "")


def role_of(request: Request) -> str | None:
    """로그인한 부류. 잠금이 없으면(개발·테스트) 안전관리자로 본다."""
    if not required():
        return "safety"
    return admin_sessions.role(session_id(request))


def is_admin(request: Request) -> bool:
    return role_of(request) is not None


def require_admin(request: Request) -> None:
    """관리자 쪽 누구나(보기). 확인만 하고 세션을 늘리지 않는다(자동 새로고침 때문)."""
    if not is_admin(request):
        raise HTTPException(401, "관리자 로그인이 필요합니다")


def require(action: str):
    """특정 일(analyze·edit·approve·publish·reply·photo)을 할 수 있는 부류만."""
    def dep(request: Request) -> None:
        r = role_of(request)
        if r is None:
            raise HTTPException(401, "관리자 로그인이 필요합니다")
        if not roles.can(r, action):
            raise HTTPException(403, f"{roles.LABELS.get(r, r)} 계정은 이 작업을 할 수 없어요")
    return dep
