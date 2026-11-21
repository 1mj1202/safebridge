"""에이전트 실행·위험성평가 초안 검토/승인·TBM 발행 API (관리자)."""
import copy
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agent import runner
from app.agent.explain_clean import clean_draft
from app.core.clock import today
from app.core.config import get_settings
from app.core.admin_auth import require_admin
from app.core.db import get_db
from app.llm.factory import get_provider
from app.models import Assessment, Tbm
from app.services import glossary, tbm, translate

from .schemas import ApproveRequest, AssessRequest, DraftEdit, PublishRequest

router = APIRouter(prefix="/api", dependencies=[Depends(require_admin)], tags=["assessments"])


def _out(a: Assessment) -> dict:
    return {"id": a.id, "work_date": a.work_date, "storey": a.storey, "query": a.query, "status": a.status,
            "draft": clean_draft(a.draft), "trace": a.trace, "provider": a.provider,
            "created_at": a.created_at.isoformat(),
            "approved_at": a.approved_at.isoformat() if a.approved_at else None,
            "tbms": [{"id": t.id, "token": t.token} for t in a.tbms]}


def _get(db: Session, aid: int) -> Assessment:
    a = db.get(Assessment, aid)
    if not a:
        raise HTTPException(404, "위험성평가 없음")
    return a


@router.post("/agent/assess")
def assess(req: AssessRequest, db: Session = Depends(get_db)):
    r = runner.run(get_provider(), req.query, today(), req.date, req.storey)
    d = r["draft"]
    a = Assessment(work_date=d["date"], storey=d["storey"], query=req.query, draft=d, trace=r["trace"],
                   provider=r["provider"])
    db.add(a)
    db.commit()
    return _out(a)


@router.get("/assessments")
def list_assessments(db: Session = Depends(get_db)):
    rows = db.scalars(select(Assessment).order_by(Assessment.id.desc()).limit(30)).all()
    return [{k: v for k, v in _out(a).items() if k not in ("draft", "trace")} for a in rows]


@router.get("/assessments/{aid}")
def get_assessment(aid: int, db: Session = Depends(get_db)):
    return _out(_get(db, aid))


@router.put("/assessments/{aid}")
def edit(aid: int, body: DraftEdit, db: Session = Depends(get_db)):
    a = _get(db, aid)
    if a.status != "draft":
        raise HTTPException(409, "승인된 위험성평가는 수정할 수 없습니다")
    d = copy.deepcopy(a.draft)
    if body.summary is not None:
        d["summary"] = body.summary
    if body.notes is not None:
        d["notes"] = body.notes
    by_id = {i["id"]: i for i in d["items"]}
    for e in body.items:
        it = by_id.get(e.id)
        if not it:
            raise HTTPException(422, f"항목 {e.id} 없음")
        for f in ("explanation", "measures", "level", "included"):
            if (v := getattr(e, f)) is not None:
                it[f] = v
    a.draft = d
    db.commit()
    return _out(a)


@router.post("/assessments/{aid}/approve")
def approve(aid: int, body: ApproveRequest | None = None, db: Session = Depends(get_db)):
    a = _get(db, aid)
    if body and body.work_date and body.work_date != a.work_date:
        raise HTTPException(409, f"이 초안은 {a.work_date} 작업 기준입니다. 보고 있는 날짜({body.work_date})와 달라 승인하지 않았어요")
    a.status = "approved"
    a.approved_at = datetime.now(timezone.utc)
    db.commit()
    return _out(a)


@router.post("/assessments/{aid}/publish")
def publish(aid: int, body: PublishRequest, db: Session = Depends(get_db)):
    a = _get(db, aid)
    if a.status != "approved":
        raise HTTPException(409, "관리자 승인 후 발행할 수 있습니다")
    cards = {lang: tbm.build_cards(a.draft, lang) for lang in glossary.LANGS}
    plan = tbm.floor_plan(a.draft, cards["ko"][0]["zone_ids"])
    for lang in glossary.LANGS:
        cards[lang][0]["plan"] = plan
    check = {"phrases": {lang: tbm.phrase_term_check(cards["ko"], cards[lang], lang) for lang in glossary.LANGS}}
    if body.memo.strip():
        memo = {lang: translate.with_back_translation(body.memo.strip(), lang) for lang in glossary.LANGS}
        check["memo"] = memo
        for lang in glossary.LANGS:
            cards[lang][2]["memo"] = memo[lang]["translated"] if lang != "ko" else body.memo.strip()
            cards[lang][2]["memo_ko"] = body.memo.strip()
            cards[lang][2]["memo_translated"] = lang == "ko" or memo[lang]["ok"]
    t = Tbm(assessment_id=a.id, token=secrets.token_urlsafe(9), cards=cards, translation_check=check)
    db.add(t)
    db.commit()
    return tbm_out(t)


def tbm_out(t: Tbm) -> dict:
    return {"id": t.id, "assessment_id": t.assessment_id, "token": t.token,
            "url": f"{get_settings().public_web_url.rstrip('/')}/w/{t.token}",
            "cards": t.cards, "translation_check": t.translation_check,
            "published_at": t.published_at.isoformat()}


@router.get("/tbms/{tid}")
def get_tbm(tid: int, db: Session = Depends(get_db)):
    t = db.get(Tbm, tid)
    if not t:
        raise HTTPException(404, "TBM 없음")
    return tbm_out(t)


@router.get("/tbms/{tid}/status")
def tbm_status(tid: int, db: Session = Depends(get_db)):
    t = db.get(Tbm, tid)
    if not t:
        raise HTTPException(404, "TBM 없음")
    langs = {}
    for lang in glossary.LANGS:
        acks = [k for k in t.acks if k.lang == lang]
        viewed = sum(1 for k in acks if k.status == "viewed")
        understood = sum(1 for k in acks if k.status == "understood")
        question = sum(1 for k in acks if k.status == "question")
        langs[lang] = {"viewed": viewed, "understood": understood, "question": question,
                       "rate": min(1.0, round(understood / viewed, 2)) if viewed else None,
                       "needs_followup": question > 0 or (viewed > 0 and understood < viewed)}
    return {
        "tbm_id": t.id, "langs": langs,
        "reports": [{"id": r.id, "kind": r.kind, "lang": r.lang, "text_original": r.text_original,
                     "text_ko": r.text_ko, "created_at": r.created_at.isoformat()}
                    for r in sorted(t.reports, key=lambda r: r.id, reverse=True)],
    }
