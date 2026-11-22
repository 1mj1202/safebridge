"""근로자 현장 챗봇의 구역 브리핑 — 승인된 초안의 구역별 브리핑(agent/briefing.py)을 근로자 언어로.

문장은 모두 문장 은행(고정 번역)에서 고른다. 관리자가 뺀 항목(included=False)·바꾼 위험도는 그대로 따른다.
"""
from __future__ import annotations

from . import glossary, names, videos
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
    # 위험마다 바로 밑에 대책 한 줄(build.<key>) — 따로 있던 '작업 순서' 줄과 같은 내용이라 합쳤다 (사용자 결정 2026-11-22).
    # 번호는 현장 전체 순위가 아니라 이 구역 안에서 1부터.
    phrases = glossary.load_json("phrases.json")["phrases"]
    safety, checks = [], []
    for s in b["safety"]:
        it = items.get(s["item_id"])
        if not it:
            continue
        k = it["key"]
        safety.append({"item_id": it["id"], "level": it["level"], "rank": len(safety) + 1,
                       "pictogram": PICTO.get(k), "text": glossary.phrase(f"hazard.{k}", lang),
                       "measure": glossary.phrase(f"build.{k}", lang) if f"build.{k}" in phrases else None})
        checks += [c for c in it.get("checks", []) if c not in checks]
    build = [glossary.phrase("chat.restricted", lang)] if b["restricted"] else []
    hazard_keys = [items[s["item_id"]]["key"] for s in b["safety"] if s["item_id"] in items]
    return {
        "zone": b["zone"], "lang": lang, "label": names.zone(b["zone"], lang), "storey": b["storey"], "restricted": b["restricted"],
        "teams": [{"team": names.team(t["trade"], lang), "lead": names.lead(t["trade"], lang)} for t in b["teams"]],
        "title": glossary.phrase("chat.today", lang, zone=names.zone(b["zone"], lang)),
        "sections": [
            {"type": "weather", "title": glossary.phrase("chat.weather", lang), "lines": weather},
            {"type": "build", "title": glossary.phrase("chat.build", lang), "lines": [{"text": t} for t in build]},
            {"type": "safety", "title": glossary.phrase("chat.safety", lang), "lines": safety},
        ],
        "checks": [glossary.phrase(c, lang) for c in checks[:5]],
        # 근로자가 마지막에 기억할 한 줄: 출입 통제 구역은 승인된 구역 지침(출입금지) 그대로.
        # 작업 구역은 관리자 한마디가 이 자리에 온다(api/field.py).
        "final": glossary.phrase("chat.restricted_final", lang) if b["restricted"] else None,
        "photo": None if b["restricted"] else photo_request(hazard_keys, lang),
        "videos": videos.kosha_links(hazard_keys) if hazard_keys else [],
        "sims": sims(hazard_keys, lang),
    }


SIM_KINDS = ("fall_edge", "fall_opening", "falling_object", "collapse")


def sims(hazard_keys: list[str], lang: str) -> list[dict]:
    """예방 영상(3D 사고 재현) 장면 — 위험 순위대로 사고 장면 + 대책 장면 자막(문장 은행 고정 번역)."""
    out = []
    for k in hazard_keys:
        if k in SIM_KINDS and k not in [x["kind"] for x in out]:
            out.append({"kind": k, "accident": glossary.phrase(f"hazard.{k}", lang),
                        "measure": glossary.phrase(f"build.{k}", lang)})
    return out


def photo_request(hazard_keys: list[str], lang: str) -> dict | None:
    """가장 높은 순위 위험의 안전시설 사진 1장 요청 (출입 통제 구역은 요청하지 않는다)."""
    key = next((f"photo.{k}" for k in hazard_keys if f"photo.{k}" in glossary.load_json("phrases.json")["phrases"]), None)
    return {"key": key, "text": glossary.phrase(key, lang)} if key else None


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
