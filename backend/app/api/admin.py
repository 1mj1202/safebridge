"""관리자 로그인 — 비밀번호 확인 후 HttpOnly 세션 쿠키. 마지막 사용 뒤 15분이면 자동 로그아웃."""
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field

from app.core import admin_auth, admin_sessions

router = APIRouter(prefix="/api/admin", tags=["admin"])


class LoginRequest(BaseModel):
    password: str = Field(..., min_length=1, max_length=200)


def _info(ok: bool) -> dict:
    return {"required": admin_auth.required(), "ok": ok, "idle_seconds": admin_sessions.idle_seconds()}


@router.get("/me")
def me(request: Request):
    return _info(admin_auth.is_admin(request))


@router.post("/login")
def login(body: LoginRequest, request: Request, response: Response):
    if not admin_auth.check_password(body.password):
        raise HTTPException(401, "비밀번호가 맞지 않습니다")
    admin_sessions.drop(admin_auth.session_id(request))
    https = request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https"
    # max_age 없음 = 브라우저를 닫으면 사라지는 쿠키. 만료는 서버가 마지막 사용 시각으로 판단한다
    response.set_cookie(admin_auth.COOKIE, admin_sessions.create(), httponly=True, samesite="lax", secure=https)
    return _info(True)


@router.post("/touch")
def touch(request: Request):
    """관리자가 화면을 실제로 썼을 때(클릭·입력·스크롤) 화면이 보낸다 → 15분을 다시 센다."""
    if not admin_auth.required():
        return _info(True)
    if not admin_sessions.touch(admin_auth.session_id(request)):
        raise HTTPException(401, "관리자 로그인이 필요합니다")
    return _info(True)


@router.post("/logout")
def logout(request: Request, response: Response):
    admin_sessions.drop(admin_auth.session_id(request))
    response.delete_cookie(admin_auth.COOKIE)
    return {"ok": True}
