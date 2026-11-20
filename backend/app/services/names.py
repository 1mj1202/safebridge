"""근로자 화면용 이름 표기 — 구역(A동 3F-a)·팀(형틀팀)·반장을 근로자 언어로.

DB·관리자 화면·전달 대상은 한국어 이름을 그대로 쓰고, 근로자에게 보여 줄 때만 문장 은행으로 바꾼다.
공종 단어는 용어 사전 고정 번역(거푸집 → cốp pha)을 쓴다.
"""
from __future__ import annotations

from . import glossary, site

# 팀 공종 → 용어 사전 한국어 표제어
TRADE_TERM = {"거푸집": "거푸집", "철근": "철근", "타설": "콘크리트 타설", "양중": "양중"}


def _term(ko: str, lang: str) -> str:
    t = next((t for t in glossary.terms() if t["ko"] == ko), None)
    return t[lang] if t and lang != "ko" else ko


def zone(name: str, lang: str) -> str:
    """'A동 3F-a' → 'Tòa A 3F-a', 'A동 외곽 지상' → 'Tòa A mặt đất bên ngoài'."""
    if lang == "ko":
        return name
    building = site.info()["building"]
    if not name.startswith(building):
        return name
    rest = name[len(building):].strip()
    b = glossary.phrase("zone.building", lang, b=building.removesuffix("동"))
    ground = glossary.phrase("zone.ground", "ko")
    return f"{b} {glossary.phrase('zone.ground', lang) if rest == ground else rest}"


def team(trade: str, lang: str) -> str:
    if lang == "ko":
        t = site.team_for(trade)
        return t["team"] if t else trade
    return glossary.phrase("role.team", lang, name=_term(TRADE_TERM.get(trade, trade), lang))


def lead(trade: str, lang: str) -> str:
    if lang == "ko":
        t = site.team_for(trade)
        return t["lead"] if t else glossary.phrase("role.lead", "ko", team=team(trade, "ko"))
    return glossary.phrase("role.lead", lang, team=team(trade, lang))


def first_contact(teams: list[dict], lang: str) -> str:
    """문제 알리기를 처음 받는 사람: 구역 첫 팀 반장, 팀이 없으면 원청 공사담당."""
    return lead(teams[0]["trade"], lang) if teams else glossary.phrase("role.construction", lang)
