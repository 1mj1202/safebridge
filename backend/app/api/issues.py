"""현장 이슈함(관리자) — 구역 반장·공사담당이 보고 한국어로 회신하면 근로자 언어로 번역해 돌려준다."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.admin_auth import require_admin
from app.core.db import get_db
from app.models import Issue, Tbm
from app.services import issues

from .schemas import AnswerRequest

router = APIRouter(prefix="/api", dependencies=[Depends(require_admin)], tags=["issues"])


def issue_out(i: Issue) -> dict:
    return {"id": i.id, "tbm_id": i.tbm_id, "zone": i.zone, "lang": i.lang, "text_original": i.text_original,
            "text_ko": i.text_ko, "summary_ko": i.summary_ko, "urgency": i.urgency, "safety": i.safety,
            "translated": i.translated, "route": i.route, "status": i.status, "answer_ko": i.answer_ko,
            "answer_translated": i.answer_translated, "created_at": i.created_at.isoformat(),
            "answered_at": i.answered_at.isoformat() if i.answered_at else None}


@router.get("/tbms/{tid}/issues")
def list_issues(tid: int, db: Session = Depends(get_db)):
    if not db.get(Tbm, tid):
        raise HTTPException(404, "TBM 없음")
    rows = db.scalars(select(Issue).where(Issue.tbm_id == tid)).all()
    # 긴급·미회신 먼저
    rows = sorted(rows, key=lambda i: (i.status != "open", i.urgency != "urgent", -i.id))
    return [issue_out(i) for i in rows]


@router.post("/issues/{iid}/answer")
def answer(iid: int, body: AnswerRequest, db: Session = Depends(get_db)):
    i = db.get(Issue, iid)
    if not i:
        raise HTTPException(404, "이슈 없음")
    tr = issues.answer(body.text_ko.strip(), i.lang)
    i.answer_ko = body.text_ko.strip()
    i.answer_translated = tr["text"] if tr["ok"] else ""
    i.status = "answered"
    i.answered_at = datetime.now(timezone.utc)
    db.commit()
    return issue_out(i)
