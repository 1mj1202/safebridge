"""위험요소 프로파일 — 공종×사고유형별 사고가능성·심각성(1~5) 평균. 위험도의 빈도·강도 근거."""
from __future__ import annotations

from app.services.data_store import load_json


def get(trade: str, accident_type: str) -> dict | None:
    return load_json("risk_profile.json")["rows"].get(f"{trade}|{accident_type}")


def all_rows() -> list[dict]:
    return list(load_json("risk_profile.json")["rows"].values())


def by_id(rid: str) -> dict | None:
    return next((r for r in load_json("risk_profile.json")["rows"].values() if r["id"] == rid), None)


def source() -> str:
    return load_json("risk_profile.json")["source"]
