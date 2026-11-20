"""사고 통계: 국토안전관리원 건설안전사고(01, 날씨·공정률) + 안전보건공단 시간대별 사망(03)."""
from __future__ import annotations

from collections import Counter
from pathlib import Path

from .common import find, read_csv

KISTEC = "국토안전관리원 건설안전사고 재해자특성 2019-2025"
KOSHA_TIME = "안전보건공단 건설업 시간대별 사고사망자수 2016-2021"


def build(src: Path) -> dict:
    rows = read_csv(find(src, "01_국토안전관리원"))
    rc = [r for r in rows if r["공종(소분류)"] == "철근콘크리트공사"]
    weather = Counter(r["날씨"] for r in rc if r["날씨"] != "미입력")
    fatal = Counter(r["날씨"] for r in rc if r["날씨"] != "미입력" and int(r["사망자"] or 0) > 0)
    hourly = []
    for r in read_csv(find(src, "03_안전보건공단")):
        hourly.append({"slot": r["재해시간"].replace(" 시전", "시"),
                       "deaths": sum(int(v) for k, v in r.items() if k != "재해시간" and v.isdigit())})
    peak = sorted(hourly, key=lambda h: -h["deaths"])[:2]
    return {
        "_note": f"출처: {KISTEC}; {KOSHA_TIME}",
        "rc_weather": {"source": KISTEC, "trade": "철근콘크리트공사", "total": sum(weather.values()),
                       "by_weather": dict(weather.most_common()), "fatal_by_weather": dict(fatal.most_common())},
        "hourly_deaths": {"source": KOSHA_TIME, "slots": hourly, "peak": [p["slot"] for p in peak]},
    }
