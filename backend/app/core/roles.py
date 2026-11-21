"""관리자 쪽 이용자 부류와 권한. 근로자는 따로(worker_auth, 이름·PIN).

- safety  관리자·안전관리자 : 분석·수정·발행·이슈 회신·사진 확인 (전체 업무)
- manager 현장소장·원청     : 보기 + 승인(결재) + 이슈 회신·사진 확인
- viewer  발주처·감리       : 보기 전용

부류별 비밀번호는 .env(SAFEBRIDGE_ADMIN_PASSWORD / _MANAGER_PASSWORD / _VIEWER_PASSWORD).
현장소장 비밀번호가 없으면 승인할 사람이 없으니 안전관리자가 승인한다(예전 동작).
"""
from __future__ import annotations

import hmac

from .config import get_settings

ROLES = ("safety", "manager", "viewer")
LABELS = {"safety": "관리자·안전관리자", "manager": "현장소장·원청", "viewer": "발주처·감리"}

_PERMS = {
    "safety": {"view", "analyze", "edit", "publish", "reply", "photo"},
    "manager": {"view", "approve", "reply", "photo"},
    "viewer": {"view"},
}


def password(role: str) -> str:
    s = get_settings()
    return {"safety": s.admin_password, "manager": s.manager_password, "viewer": s.viewer_password}.get(role, "")


def enabled() -> list[str]:
    """비밀번호가 정해져 있어 로그인할 수 있는 부류."""
    return [r for r in ROLES if password(r)]


def check(role: str, pw: str) -> bool:
    want = password(role)
    return bool(want) and hmac.compare_digest(pw.encode(), want.encode())


def perms(role: str) -> set[str]:
    p = set(_PERMS.get(role, set()))
    if role == "safety" and not password("manager"):
        p.add("approve")
    return p


def can(role: str | None, action: str) -> bool:
    return bool(role) and action in perms(role)
