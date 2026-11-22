"""관리자 쪽 이용자 부류와 권한. 근로자는 따로(worker_auth, 이름·PIN).

- safety  관리자·안전관리자 : 분석·수정·발행·이슈 회신·사진 확인 (전체 업무)
- manager 현장소장·원청     : 보기 + 승인(결재) + 이슈 회신·사진 확인
- viewer  발주처·감리       : 보기 전용

부류별 비밀번호는 .env(SAFEBRIDGE_ADMIN_PASSWORD / _MANAGER_PASSWORD / _VIEWER_PASSWORD).
비밀번호 확인(staff_password_check)은 기본으로 꺼 두어 부류를 고르기만 하면 들어간다 (사용자 결정 2026-11-22).
이때도 비밀번호가 하나라도 있으면 부류별 권한은 그대로 지킨다. 비밀번호가 하나도 없으면 잠금 없음(개발·테스트).
현장소장으로 들어갈 수 없으면 승인할 사람이 없으니 안전관리자가 승인한다(예전 동작).
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


def checking() -> bool:
    return get_settings().staff_password_check


def enabled() -> list[str]:
    """들어갈 수 있는 부류. 비밀번호 확인을 끄면(잠금이 있을 때) 세 부류 모두."""
    has = [r for r in ROLES if password(r)]
    return has if checking() or not has else list(ROLES)


def check(role: str, pw: str) -> bool:
    if role not in ROLES:
        return False
    if not checking():
        return True
    want = password(role)
    return bool(want) and hmac.compare_digest(pw.encode(), want.encode())


def perms(role: str) -> set[str]:
    p = set(_PERMS.get(role, set()))
    if role == "safety" and "manager" not in enabled():
        p.add("approve")
    return p


def can(role: str | None, action: str) -> bool:
    return bool(role) and action in perms(role)
