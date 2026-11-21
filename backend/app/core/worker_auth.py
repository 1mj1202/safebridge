"""근로자 로그인 — PIN 해시, 로그인 쿠키(HttpOnly, 180일), 틀린 PIN 연속 시 잠깐 잠금."""
from __future__ import annotations

import hashlib
import hmac
import secrets
import time

from fastapi import HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

COOKIE = "sb_worker"
MAX_AGE = 180 * 24 * 3600
MAX_FAILS, LOCK_SEC = 5, 300
_ITER = 100_000
_fails: dict[tuple[str, str], tuple[int, float]] = {}


def hash_pin(pin: str) -> str:
    salt = secrets.token_hex(8)
    return f"{salt}${hashlib.pbkdf2_hmac('sha256', pin.encode(), salt.encode(), _ITER).hex()}"


def check_pin(pin: str, stored: str) -> bool:
    salt, _, h = stored.partition("$")
    got = hashlib.pbkdf2_hmac("sha256", pin.encode(), salt.encode(), _ITER).hex()
    return hmac.compare_digest(got, h)


def locked(key: tuple[str, str]) -> bool:
    n, until = _fails.get(key, (0, 0.0))
    return n >= MAX_FAILS and time.time() < until


def record_fail(key: tuple[str, str]) -> None:
    n, until = _fails.get(key, (0, 0.0))
    if n >= MAX_FAILS and time.time() >= until:
        n = 0  # 잠금이 풀린 뒤 다시 센다
    n += 1
    _fails[key] = (n, time.time() + LOCK_SEC if n >= MAX_FAILS else 0.0)


def clear_fails(key: tuple[str, str]) -> None:
    _fails.pop(key, None)


def set_cookie(request: Request, response: Response, token: str) -> None:
    https = request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https"
    response.set_cookie(COOKIE, token, max_age=MAX_AGE, httponly=True, samesite="lax", secure=https)


def current(request: Request, db: Session):
    """로그인한 근로자 또는 None (가입 없이 보기)."""
    from app.models import Worker

    tok = request.cookies.get(COOKIE, "")
    return db.scalar(select(Worker).where(Worker.token == tok)) if tok else None


def require(request: Request, db: Session):
    w = current(request, db)
    if w is None:
        raise HTTPException(401, "근로자 로그인이 필요합니다")
    return w
