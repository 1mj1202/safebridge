"""관리자 쪽 입장 — 부류(안전관리자·현장소장·발주처/감리)를 고르면 HttpOnly 세션 쿠키.
비밀번호 확인은 기본으로 꺼져 있다(roles.checking). 켜면 아래처럼 동작한다.

한 번 로그인한 기기는 쿠키가 30일 남아 다시 열면 자동으로 들어간다. 다만 마지막 사용 뒤 15분이 지나면
서버가 세션을 끝내 다시 로그인해야 한다. 세션은 DB에 있어 서버를 다시 켜도 풀리지 않는다.
"""
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field

from app.core import admin_auth, admin_sessions, roles

router = APIRouter(prefix="/api/admin", tags=["admin"])

COOKIE_DAYS = 30


class LoginRequest(BaseModel):
    password: str = Field("", max_length=200)  # 비밀번호 확인을 끄면 비워 둔다
    role: str = "safety"


def _info(role: str | None) -> dict:
    return {"required": admin_auth.required(), "ok": role is not None, "idle_seconds": admin_sessions.idle_seconds(),
            "role": role, "label": roles.LABELS.get(role or "", ""), "perms": sorted(roles.perms(role)) if role else [],
            "roles": [{"id": r, "label": roles.LABELS[r]} for r in roles.enabled()]}


@router.get("/me")
def me(request: Request):
    return _info(admin_auth.role_of(request))


@router.post("/login")
def login(body: LoginRequest, request: Request, response: Response):
    if body.role not in roles.ROLES or not roles.check(body.role, body.password):
        raise HTTPException(401, "비밀번호가 맞지 않습니다")
    admin_sessions.drop(admin_auth.session_id(request))
    https = request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https"
    response.set_cookie(admin_auth.COOKIE, admin_sessions.create(body.role), httponly=True, samesite="lax",
                        secure=https, max_age=COOKIE_DAYS * 24 * 3600)
    return _info(body.role)


@router.post("/touch")
def touch(request: Request):
    """화면을 실제로 썼을 때(클릭·입력·스크롤) 화면이 보낸다 → 15분을 다시 센다."""
    if not admin_auth.required():
        return _info("safety")
    sid = admin_auth.session_id(request)
    if not admin_sessions.touch(sid):
        raise HTTPException(401, "관리자 로그인이 필요합니다")
    return _info(admin_sessions.role(sid))


@router.post("/logout")
def logout(request: Request, response: Response):
    admin_sessions.drop(admin_auth.session_id(request))
    response.delete_cookie(admin_auth.COOKIE)
    return {"ok": True}
