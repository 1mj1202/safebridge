"""근로자 가입·로그인 API — 이름·소속 업체·언어·4자리 PIN. 한 번 로그인하면 쿠키로 기억(태그만 하면 됨)."""
from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.core import worker_auth
from app.core.db import get_db
from app.services import glossary, workers

from .schemas import SignupRequest, WorkerLoginRequest
from .worker import _lang

router = APIRouter(prefix="/api/workers", tags=["workers"])

UI_KEYS = ("signup", "login", "name", "company", "pin", "guest", "have_account", "new_account",
           "wrong", "taken", "locked", "logout")


@router.get("/companies")
def companies(lang: str = "ko"):
    lang = _lang(lang)
    return {"companies": workers.companies(), "ui": {k: glossary.phrase(f"auth.{k}", lang) for k in UI_KEYS}}


@router.get("/me")
def me(request: Request, db: Session = Depends(get_db)):
    w = worker_auth.current(request, db)
    return {"worker": workers.out(w) if w else None}


@router.post("/signup")
def signup(body: SignupRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    w = workers.signup(db, body.name, body.company, _lang(body.lang), body.pin)
    worker_auth.set_cookie(request, response, w.token)
    return {"worker": workers.out(w)}


@router.post("/login")
def login(body: WorkerLoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    w = workers.login(db, body.name, body.company, body.pin)
    worker_auth.set_cookie(request, response, w.token)
    return {"worker": workers.out(w)}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(worker_auth.COOKIE)
    return {"ok": True}
