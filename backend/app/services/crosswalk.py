"""공종 크로스워크 — 공정표 공종 ↔ 표준 공종키(RC-FORM 등) ↔ 출처별 표기."""
from __future__ import annotations

from app.services.data_store import load_json


def keys() -> list[dict]:
    return load_json("crosswalk.json")["keys"]


def for_trade(trade: str) -> dict | None:
    return next((k for k in keys() if k["trade"] == trade), None)


def work_key(trade: str) -> str | None:
    k = for_trade(trade)
    return k["key"] if k else None
