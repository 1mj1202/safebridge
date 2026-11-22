"""근로자 현장 챗봇 API — QR 토큰(+구역)만으로 접속. 이름·연락처는 받지 않는다."""
import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import Issue
from app.services import field_chat, glossary, issues, names, risk, schedule, site, translate, zone_brief

from .launch import stamp
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
    ui.update({k: glossary.phrase(f"ui.{k}", lang) for k in ("understood", "understood_q", "read_again", "question", "report", "listen", "photo", "video",
                                                                 "switch_role")})
    ui["logout"] = glossary.phrase("auth.logout", lang)
    ui.update({k: glossary.phrase(f"ui.{k}", lang) for k in ("work_day", "approved", "published", "loading")})
    # 근로자가 읽는 발행본 표시(작업일·승인·발행 시각·번호) — 관리자 발행 화면과 대조할 수 있게
    return {"lang": lang, "langs": glossary.lang_names(), "work_date": a.work_date, "stamp": stamp(t),
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
    tc = t.translation_check or {}
    place, _hz, check = t.cards[lang]
    restricted = zone_brief.find(t.assessment.draft, zone)["restricted"]
    # 관리자 한마디가 이미 말하는 확인 항목(예: 안전대)은 체크 박스에서 뺀다 — 출입 통제 구역은 한마디가 없으니 그대로
    skip = set() if restricted else zone_brief.memo_skips(check.get("memo_ko") or "")
    out = zone_brief.brief(t.assessment.draft, zone, lang, tc.get("weather"), skip)
    # 평면도는 작업 층 구역에만. 관리자 한마디는 작업 구역에만 — 출입 통제 구역은 마지막 줄이 출입금지 지침이다
    out["plan"] = place.get("plan") if place.get("plan") and place["plan"]["storey"] == out["storey"] else None
    out["memo"] = "" if out["restricted"] else _memo(check, (tc.get("memo") or {}).get(lang), lang)
    return out


def _memo(card: dict, mcheck: dict | None, lang: str) -> str:
    """관리자 한마디: 뜻 검사(작업·조건·지시)를 통과한 번역만. 아니면 승인 원문(한국어)에 표시를 붙인다."""
    ko = card.get("memo_ko") or ""
    if not ko or lang == "ko":
        return ko
    if card.get("memo_translated") and translate.still_ok(mcheck):
        return card.get("memo") or ko
    return f"{glossary.phrase('ui.approved_ko', lang)}: {ko}"


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
