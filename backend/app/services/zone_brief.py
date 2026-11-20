"""근로자 현장 챗봇의 구역 브리핑 — 승인된 초안의 구역별 브리핑(agent/briefing.py)을 근로자 언어로.

문장은 모두 문장 은행(고정 번역)에서 고른다. 관리자가 뺀 항목(included=False)·바꾼 위험도는 그대로 따른다.
"""
from __future__ import annotations

from . import glossary, names
from .tbm import PICTO


def zones(draft: dict, lang: str = "ko") -> list[dict]:
    return [{"zone": b["zone"], "label": names.zone(b["zone"], lang), "storey": b["storey"],
             "restricted": b["restricted"], "teams": [names.team(t["trade"], lang) for t in b["teams"]],
             "langs": b["langs"]} for b in draft.get("briefings", [])]


def find(draft: dict, zone: str) -> dict | None:
    return next((b for b in draft.get("briefings", []) if b["zone"] == zone), None)


def _items(draft: dict) -> dict[str, dict]:
    return {i["id"]: i for i in draft["items"] if i.get("included", True)}


def brief(draft: dict, zone: str, lang: str) -> dict | None:
    b = find(draft, zone)
    if b is None:
        return None
    items = _items(draft)
    weather = []
    for w in b["weather"]:
        it = items.get(w["item_id"])
        if it:
            weather.append({"item_id": it["id"], "level": it["level"], "pictogram": PICTO.get(it["key"]),
                            "text": glossary.phrase(it["weather"]["phrase"], lang, value=it["weather"]["value"])})
    safety, checks = [], []
    for s in b["safety"]:
        it = items.get(s["item_id"])
        if not it:
            continue
        safety.append({"item_id": it["id"], "level": it["level"], "rank": it.get("risk_rank"),
                       "pictogram": PICTO.get(it["key"]), "text": glossary.phrase(f"hazard.{it['key']}", lang)})
        checks += [c for c in it.get("checks", []) if c not in checks]
    build = [glossary.phrase(f"build.{k}", lang) for k in b.get("build_keys", [])]
    if b["restricted"]:
        build.insert(0, glossary.phrase("chat.restricted", lang))
    return {
        "zone": b["zone"], "label": names.zone(b["zone"], lang), "storey": b["storey"], "restricted": b["restricted"],
        "teams": [{"team": names.team(t["trade"], lang), "lead": names.lead(t["trade"], lang)} for t in b["teams"]],
        "title": glossary.phrase("chat.today", lang, zone=names.zone(b["zone"], lang)),
        "sections": [
            {"type": "weather", "title": glossary.phrase("chat.weather", lang), "lines": weather},
            {"type": "build", "title": glossary.phrase("chat.build", lang), "lines": [{"text": t} for t in build]},
            {"type": "safety", "title": glossary.phrase("chat.safety", lang), "lines": safety},
        ],
        "checks": [glossary.phrase(c, lang) for c in checks[:5]],
    }


def context_ko(draft: dict, zone: str) -> str:
    """챗봇 LLM 에 주는 근거(한국어) — 승인된 브리핑·대책·확인사항만."""
    b = find(draft, zone)
    if b is None:
        return ""
    items = _items(draft)
    lines = [f"구역: {b['zone']} ({'출입 통제 구역' if b['restricted'] else '작업 구역'})",
             "팀: " + (", ".join(f"{t['team']}(반장: {t['lead']})" for t in b["teams"]) or "없음")]
    for w in b["weather"]:
        if w["item_id"] in items:
            lines.append(f"날씨: {items[w['item_id']]['hazard']}")
    lines += [f"시공 순서: {t}" for t in b["build"]]
    for s in b["safety"]:
        it = items.get(s["item_id"])
        if not it:
            continue
        lines.append(f"위험 {it.get('risk_rank', '')}순위: {it['hazard']} (위험도 {it['level']}, 위치 {it['location']})")
        lines += [f"  - 대책: {m}" for m in it.get("measures", [])[:3]]
        lines += [f"  - 확인: {glossary.phrase(c, 'ko')}" for c in it.get("checks", [])]
        if it.get("explanation"):
            lines.append(f"  - 설명: {it['explanation']}")
    return "\n".join(lines)
