"""위험 순위 — R = P × S × w + 기상 보정 (초안 v5 별첨 2-4).

P·S: 위험요소 프로파일의 사고가능성·심각성 평균(1~5), w: 공종 사고 빈도 가중치(01 재해자 특성),
기상 보정: 강풍 경보가 그 위험(단부·낙하·양중)에 걸리면 +1(주의) / +2(작업중지).
화면에는 "확률 예측이 아닌 위험도·빈도 순위"로 표시한다. w·보정 크기는 초기값이며 검증 세트로 조정한다.
"""
from __future__ import annotations

from app.services import crosswalk, stats

TOP_N = 5
WIND_SENSITIVE = {"fall_edge", "falling_object", "caught"}
WEATHER_BONUS = {"stop": 2, "warn": 1}


def level(p: float, s: float) -> str:
    ps = p * s
    return "상" if ps >= 11 else "중" if ps >= 7 else "하"


def _weight(trades: list[str]) -> float:
    ws = [stats.weight(k["kistec01"]) for t in trades if (k := crosswalk.for_trade(t))]
    return max(ws, default=1.0)


def _bonus(item: dict, alerts: list[dict]) -> int:
    if item["key"] not in WIND_SENSITIVE:
        return 0
    return max((WEATHER_BONUS.get(a["level"], 0) for a in alerts
                if a["code"].startswith("wind") and set(a.get("affects") or item["trades"]) & set(item["trades"])),
               default=0)


def apply(items: list[dict], alerts: list[dict]) -> list[dict]:
    """위험 항목에 P·S·w·R·순위를 붙이고 순위대로 정렬한다(기상 항목은 뒤에 그대로)."""
    hazards = [i for i in items if not i["key"].startswith("weather_")]
    weather = [i for i in items if i["key"].startswith("weather_")]
    for it in hazards:
        prof = it.get("profile")
        if not prof:
            it["rank_basis"] = None
            it["risk_score"] = 0.0
            continue
        p, s = prof["likelihood"], prof["severity"]
        w = _weight(it["trades"])
        bonus = _bonus(it, alerts)
        it["level"] = level(p, s)
        it["risk_score"] = round(p * s * w + bonus, 1)
        it["rank_basis"] = {"p": round(p), "s": round(s), "p_raw": p, "s_raw": s, "w": w, "weather": bonus}
    hazards.sort(key=lambda i: -i["risk_score"])
    for n, it in enumerate(hazards, 1):
        it["risk_rank"] = n
        it["top"] = n <= TOP_N
    out = hazards + weather
    for n, it in enumerate(out, 1):
        it["id"] = f"H{n}"
    return out
