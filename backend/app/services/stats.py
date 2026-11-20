"""사고 통계 — 날씨별 철근콘크리트공사 사고, 시간대별 사망. TBM 유의사항·기상 항목 근거."""
from __future__ import annotations

from app.services.data_store import load_json

# 기상 경보 코드 → 통계의 날씨 구분
WEATHER_KEY = {"wind_crane_stop": "강풍", "wind_high": "강풍", "rain": "강우", "snow": "강설"}


def weather_fact(code: str) -> dict | None:
    w = load_json("accident_stats.json")["rc_weather"]
    key = WEATHER_KEY.get(code)
    n = w["by_weather"].get(key) if key else None
    if not n:
        return None
    return {"weather": key, "count": n, "total": w["total"], "fatal": w["fatal_by_weather"].get(key, 0),
            "trade": w["trade"], "source": w["source"]}


def by_work(kistec01: str) -> dict | None:
    b = load_json("accident_stats.json").get("by_work", {})
    row = b.get("rows", {}).get(kistec01)
    return {**row, "name": kistec01, "source": b["source"]} if row else None


def weight(kistec01: str | None) -> float:
    """빈도 가중치 w = 1 + 전체 사고 중 그 공종 비중 (예: 철근콘크리트공사 27% → 1.27)."""
    row = by_work(kistec01) if kistec01 else None
    return round(1 + row["share_of_all"], 2) if row else 1.0


def hourly_peak() -> dict:
    h = load_json("accident_stats.json")["hourly_deaths"]
    return {"peak": h["peak"], "source": h["source"]}
