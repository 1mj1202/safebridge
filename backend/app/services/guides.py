"""KOSHA GUIDE(건설안전지침) — 위험 항목별 관련 지침."""
from __future__ import annotations

from app.services.data_store import load_json

# 위험 키 → 관련 지침 번호(목록에 있는 것만 쓴다)
HAZARD_GUIDES = {
    "fall_edge": ["C-31-2017", "C-110-2018", "C-8-2015"],
    "fall_opening": ["C-31-2017", "C-8-2015"],
    "falling_object": ["C-26-2017", "C-27-2011"],
    "collapse": ["C-42-2020", "C-51-2020", "C-43-2023"],
    "caught": ["C-69-2022", "C-102-2023"],
}


def get(gid: str) -> dict | None:
    g = next((g for g in load_json("kosha_guides.json")["guides"] if g["id"] == gid), None)
    return {**g, "source": load_json("kosha_guides.json")["source"]} if g else None


def for_hazard(key: str) -> list[str]:
    return [g for g in HAZARD_GUIDES.get(key, []) if get(g)]
