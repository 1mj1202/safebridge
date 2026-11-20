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


def hourly_peak() -> dict:
    h = load_json("accident_stats.json")["hourly_deaths"]
    return {"peak": h["peak"], "source": h["source"]}
