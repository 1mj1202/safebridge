"""관리자 로그인 — 비밀번호 확인 후 HttpOnly 쿠키(30일)."""
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field

from app.core import admin_auth

router = APIRouter(prefix="/api/admin", tags=["admin"])
MAX_AGE = 30 * 24 * 3600


class LoginRequest(BaseModel):
    password: str = Field(..., min_length=1, max_length=200)


@router.get("/me")
def me(request: Request):
    return {"required": admin_auth.required(), "ok": admin_auth.is_admin(request)}


@router.post("/login")
def login(body: LoginRequest, request: Request, response: Response):
    if not admin_auth.check_password(body.password):
        raise HTTPException(401, "비밀번호가 맞지 않습니다")
    https = request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https"
    response.set_cookie(admin_auth.COOKIE, admin_auth.make_token(body.password), max_age=MAX_AGE,
                        httponly=True, samesite="lax", secure=https)
    return {"ok": True}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(admin_auth.COOKIE)
    return {"ok": True}
