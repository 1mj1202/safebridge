"""근로자 API — QR 토큰만으로 접속(로그인·개인정보 없음)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import Ack, Report, Tbm
from app.services import glossary, translate

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
            "cards": t.cards[lang], "ui": ui}


@router.post("/{token}/ack")
def ack(token: str, body: AckRequest, db: Session = Depends(get_db)):
    t = _tbm(db, token)
    db.add(Ack(tbm_id=t.id, lang=_lang(body.lang), status=body.status))
    db.commit()
    return {"ok": True}


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
