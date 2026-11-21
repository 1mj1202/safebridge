"""근로자 가입·로그인 — 소속 업체는 현장 팀 배정표(site.json)의 업체 중에서 고른다."""
from __future__ import annotations

import re
import secrets

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import worker_auth
from app.models import Worker
from app.services import site


def companies() -> list[dict]:
    """가입 화면 업체 목록 (업체 하나에 팀 하나)."""
    out: list[dict] = []
    for t in site.info()["teams"]:
        if t["company"] not in [c["company"] for c in out]:
            out.append({"company": t["company"], "team": t["team"], "trade": t["trade"]})
    return out


def clean_name(name: str) -> str:
    return re.sub(r"\s+", " ", name).strip()


def _team_of(company: str) -> str:
    c = next((c for c in companies() if c["company"] == company), None)
    if c is None:
        raise HTTPException(422, "현장에 없는 업체")
    return c["team"]


def out(w: Worker) -> dict:
    return {"id": w.id, "name": w.name, "company": w.company, "team": w.team, "lang": w.lang}


def signup(db: Session, name: str, company: str, lang: str, pin: str) -> Worker:
    name = clean_name(name)
    team = _team_of(company)
    if db.scalar(select(Worker).where(Worker.company == company, Worker.name == name)):
        raise HTTPException(409, "이미 가입된 이름")
    w = Worker(name=name, company=company, team=team, lang=lang, pin_hash=worker_auth.hash_pin(pin),
               token=secrets.token_urlsafe(32))
    db.add(w)
    db.commit()
    return w


def login(db: Session, name: str, company: str, pin: str) -> Worker:
    key = (company, clean_name(name))
    if worker_auth.locked(key):
        raise HTTPException(429, "잠시 후 다시")
    w = db.scalar(select(Worker).where(Worker.company == key[0], Worker.name == key[1]))
    if w is None or not worker_auth.check_pin(pin, w.pin_hash):
        worker_auth.record_fail(key)
        raise HTTPException(401, "이름 또는 PIN 이 맞지 않음")
    worker_auth.clear_fails(key)
    return w
