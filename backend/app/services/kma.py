"""기상청 단기예보 조회서비스(공공데이터포털) — 일 단위 요약.

격자 좌표는 SAFEBRIDGE_KMA_NX / NY (기본 서울 중구 60,127). 단기예보는 발표 시각 기준 3일 이내만 제공된다.
"""
from __future__ import annotations

import os
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import httpx

URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst"


def _base_time(now: datetime) -> tuple[str, str]:
    hours = [2, 5, 8, 11, 14, 17, 20, 23]
    t = now - timedelta(minutes=15)
    cand = [h for h in hours if h <= t.hour]
    if not cand:
        t -= timedelta(days=1)
        cand = [23]
    return t.strftime("%Y%m%d"), f"{cand[-1]:02d}00"


def daily_forecast(day: str, key: str) -> dict:
    base_date, base_time = _base_time(datetime.now(ZoneInfo("Asia/Seoul")))
    params = {"serviceKey": key, "pageNo": 1, "numOfRows": 1000, "dataType": "JSON", "base_date": base_date,
              "base_time": base_time, "nx": os.getenv("SAFEBRIDGE_KMA_NX", "60"),
              "ny": os.getenv("SAFEBRIDGE_KMA_NY", "127")}
    r = httpx.get(URL, params=params, timeout=10)
    r.raise_for_status()
    items = r.json()["response"]["body"]["items"]["item"]
    target = date.fromisoformat(day).strftime("%Y%m%d")
    rows = [i for i in items if i["fcstDate"] == target]
    if not rows:
        raise ValueError("해당 날짜 예보 없음")

    def vals(cat):
        out = []
        for i in rows:
            if i["category"] == cat:
                v = i["fcstValue"]
                try:
                    out.append(float(v.replace("mm", "")) if v not in ("강수없음",) else 0.0)
                except ValueError:
                    out.append(1.0 if "미만" in v else 0.0)
        return out

    wsd, pcp, tmp = vals("WSD"), vals("PCP"), vals("TMP")
    # 단기예보에는 순간풍속이 없어 풍속 최대값 × 1.5 를 순간풍속 추정치로 쓴다(보수적 가정)
    return {"date": day, "source": "기상청 단기예보", "wind_gust": round(max(wsd or [0]) * 1.5, 1),
            "rain_mm_h": max(pcp or [0]), "temp_min": min(tmp or [0]), "temp_max": max(tmp or [0]),
            "sky": ""}
