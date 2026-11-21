"""관리자 로그인 세션 — 마지막 사용 시각부터 admin_idle_minutes 가 지나면 끝난다.

세션은 서버 메모리에만 둔다(서버를 다시 켜면 다시 로그인). 쿠키에는 무작위 세션값만 들어간다.
연장은 화면을 실제로 쓸 때(로그인, /api/admin/touch)만 한다.
관리자 화면이 15초마다 하는 자동 새로고침 요청은 세션을 늘리지 않는다 → 켜 두기만 하면 만료된다.
"""
from __future__ import annotations

import secrets
import threading
import time

from .config import get_settings

_lock = threading.Lock()
_last_used: dict[str, float] = {}   # 세션값 → 마지막 사용 시각(time.monotonic)


def idle_seconds() -> int:
    return max(1, get_settings().admin_idle_minutes) * 60


def _expired(t: float, now: float) -> bool:
    return now - t > idle_seconds()


def create() -> str:
    sid = secrets.token_urlsafe(32)
    now = time.monotonic()
    with _lock:
        for k in [k for k, t in _last_used.items() if _expired(t, now)]:  # 끝난 세션 정리
            del _last_used[k]
        _last_used[sid] = now
    return sid


def valid(sid: str) -> bool:
    """살아 있는지 확인만 한다(연장하지 않음). 끝났으면 지운다."""
    if not sid:
        return False
    now = time.monotonic()
    with _lock:
        t = _last_used.get(sid)
        if t is None:
            return False
        if _expired(t, now):
            del _last_used[sid]
            return False
        return True


def touch(sid: str) -> bool:
    """화면을 실제로 썼을 때 — 살아 있으면 마지막 사용 시각을 지금으로."""
    if not valid(sid):
        return False
    with _lock:
        if sid in _last_used:
            _last_used[sid] = time.monotonic()
            return True
    return False


def drop(sid: str) -> None:
    with _lock:
        _last_used.pop(sid, None)


def _age_for_test(sid: str, seconds: float) -> None:
    """테스트용: 세션을 seconds 만큼 오래된 것으로 만든다."""
    with _lock:
        if sid in _last_used:
            _last_used[sid] -= seconds
