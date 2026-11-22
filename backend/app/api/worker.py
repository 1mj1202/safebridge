"""근로자 API — QR 토큰만으로 접속. 집계는 언어별 익명, 로그인한 근로자면 구역 이해 확인을 따로 남긴다."""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import worker_auth
from app.core.db import get_db
from app.models import Ack, Report, Tbm
from app.services import glossary, locations, tbm, translate

from .schemas import AckRequest, ReportRequest

router = APIRouter(prefix="/api/w", tags=["worker"])


def _tbm(db: Session, token: str) -> Tbm:
    t = db.scalar(select(Tbm).where(Tbm.token == token))
    if not t:
        raise HTTPException(404, "TBM 없음")
    return t


def _lang(lang: str) -> str:
    if lang not in glossary.LANGS:
        raise HTTPException(422, "지원하지 않는 언어")
    return lang


@router.get("/{token}")
def cards(token: str, lang: str = "ko", db: Session = Depends(get_db)):
    t = _tbm(db, token)
    lang = _lang(lang)
    ui = {k: glossary.phrase(f"ui.{k}", lang) for k in ("understood", "question", "report", "listen")}
    a = t.assessment
    return {"lang": lang, "langs": glossary.lang_names(), "work_date": a.work_date, "storey": a.storey,
            "cards": tbm.refresh_weather({lang: t.cards[lang]}, a.draft, (t.translation_check or {}).get("weather"))[lang],
            "ui": ui}


@router.post("/{token}/ack")
def ack(token: str, body: AckRequest, request: Request, db: Session = Depends(get_db)):
    t = _tbm(db, token)
    lang = _lang(body.lang)
    if body.tally:
        db.add(Ack(tbm_id=t.id, lang=lang, status=body.status))
        db.commit()
    w = worker_auth.current(request, db)
    zone_ok = bool(w and body.status == "understood" and body.zone and locations.mark_understood(db, w, t, body.zone))
    return {"ok": True, "zone_understood": zone_ok}


@router.post("/{token}/report")
def report(token: str, body: ReportRequest, db: Session = Depends(get_db)):
    t = _tbm(db, token)
    lang = _lang(body.lang)
    ko = translate.translate(body.text, lang, "ko")
    r = Report(tbm_id=t.id, kind=body.kind, lang=lang, text_original=body.text,
               text_ko=ko["text"] if ko["ok"] else f"[번역 실패] {body.text}")
    db.add(r)
    db.commit()
    return {"ok": True, "text_ko": r.text_ko}
