"""근로자 현장 챗봇 API — QR 토큰(+구역)만으로 접속. 이름·연락처는 받지 않는다."""
import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import Issue
from app.services import field_chat, glossary, issues, names, risk, schedule, site, zone_brief

from .schemas import ChatRequest, IssueRequest
from .worker import _lang, _tbm

router = APIRouter(prefix="/api/w", tags=["field"])

UI_KEYS = ("greet", "ask", "issue", "urgent", "reply", "change_zone", "ask_lead", "scan_hint")


@router.get("/{token}/zones")
def zones(token: str, lang: str = "ko", db: Session = Depends(get_db)):
    t = _tbm(db, token)
    lang = _lang(lang)
    a = t.assessment
    ui = {k: glossary.phrase(f"chat.{k}", lang) for k in UI_KEYS}
    ui.update({k: glossary.phrase(f"ui.{k}", lang) for k in ("understood", "understood_q", "read_again", "question", "report", "listen", "photo", "video")})
    ui["logout"] = glossary.phrase("auth.logout", lang)
    ui["login"] = glossary.phrase("auth.login", lang)  # 가입 없이 보기에서 가입·로그인 화면으로 돌아가기
    return {"lang": lang, "langs": glossary.lang_names(), "work_date": a.work_date,
            "zones": zone_brief.zones(a.draft, lang), "ui": ui}


def _zone(db: Session, token: str, zone: str):
    t = _tbm(db, token)
    if zone_brief.find(t.assessment.draft, zone) is None:
        raise HTTPException(404, "구역 없음")
    return t


@router.get("/{token}/brief")
def brief(token: str, zone: str, lang: str = "ko", db: Session = Depends(get_db)):
    t = _zone(db, token, zone)
    lang = _lang(lang)
    out = zone_brief.brief(t.assessment.draft, zone, lang)
    place, _hz, check = t.cards[lang]
    # 평면도는 작업 층 구역에만, 관리자 한마디는 모든 구역에
    out["plan"] = place.get("plan") if place.get("plan") and place["plan"]["storey"] == out["storey"] else None
    out["memo"] = (check.get("memo") if check.get("memo_translated") else check.get("memo_ko")) or ""
    return out


@router.post("/{token}/chat")
def chat(token: str, body: ChatRequest, db: Session = Depends(get_db)):
    t = _zone(db, token, body.zone)
    lang = _lang(body.lang)
    return field_chat.answer(body.message, lang, zone_brief.context_ko(t.assessment.draft, body.zone))


@router.post("/{token}/issue")
def issue(token: str, body: IssueRequest, db: Session = Depends(get_db)):
    t = _tbm(db, token)
    lang = _lang(body.lang)
    row = zone_brief.find(t.assessment.draft, body.zone) if body.zone else None
    tri = issues.triage(body.text, lang)
    route = issues.route(row, tri["urgency"], tri["safety"])
    it = Issue(tbm_id=t.id, key=secrets.token_urlsafe(9), zone=row["zone"] if row else "", lang=lang,
               text_original=body.text, text_ko=tri["text_ko"], summary_ko=tri["summary_ko"],
               urgency=tri["urgency"], safety=tri["safety"], translated=tri["translated"], route=route)
    db.add(it)
    db.commit()
    lead = names.first_contact((row or {}).get("teams", []), lang)
    msgs = [glossary.phrase("chat.sent", lang, lead=lead)]
    if it.urgency == "urgent":
        msgs.insert(0, glossary.phrase("chat.urgent", lang))
    return {"id": it.id, "key": it.key, "urgency": it.urgency, "route": route, "lead": lead, "messages": msgs}


@router.get("/{token}/issues/{iid}")
def issue_status(token: str, iid: int, key: str, db: Session = Depends(get_db)):
    t = _tbm(db, token)
    it = db.get(Issue, iid)
    if not it or it.tbm_id != t.id or not secrets.compare_digest(it.key, key):
        raise HTTPException(404, "이슈 없음")
    return {"id": it.id, "status": it.status, "answer": it.answer_translated or it.answer_ko,
            "title": glossary.phrase("chat.reply", it.lang)}


@router.get("/{token}/scene")
def scene(token: str, zone: str, db: Session = Depends(get_db)):
    """근로자 3D 화면: 공정 상태 + 내 구역 상자 + 내 구역에 걸린 위험 영역 (모델 형상은 /api/bim/model)."""
    t = _zone(db, token, zone)
    day = t.assessment.draft["date"]
    zs = [z for z in risk.zones_on(day) if zone in site.zones_of_hazard(z)]
    return {"date": day, "focus": site.zone_box(zone), "element_status": schedule.element_status(day), "zones": zs}
