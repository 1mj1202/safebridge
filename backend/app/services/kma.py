"""기상청 단기예보 조회서비스(공공데이터포털) — 일 단위 요약.

신청: https://www.data.go.kr/data/15084084/openapi.do  (일반 인증키 Decoding 값을 SAFEBRIDGE_KMA_SERVICE_KEY 에)
격자 좌표는 SAFEBRIDGE_KMA_NX / NY (기본 서울 중구 60,127). 단기예보는 발표 시각 기준 3일 이내만 제공된다.
같은 발표분은 한 번만 조회해 메모리에 보관한다(발표는 3시간마다).
"""
from __future__ import annotations

import os
import re
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import httpx

URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst"
SKY = {"1": "맑음", "3": "구름많음", "4": "흐림"}
PTY = {"1": "비", "2": "비/눈", "3": "눈", "4": "소나기"}

_cache: dict[tuple, list[dict]] = {}


def base_time(now: datetime) -> tuple[str, str]:
    """가장 최근 발표 시각(02·05·…·23시, 발표 후 약 10분 뒤 제공 → 15분 여유)."""
    hours = [2, 5, 8, 11, 14, 17, 20, 23]
    t = now - timedelta(minutes=15)
    cand = [h for h in hours if h <= t.hour]
    if not cand:
        t -= timedelta(days=1)
        cand = [23]
    return t.strftime("%Y%m%d"), f"{cand[-1]:02d}00"


def parse_pcp(v: str) -> float:
    """강수량 표기: '강수없음', '1mm 미만', '1.0mm', '30.0~50.0mm', '50.0mm 이상' → mm/h (범위는 상한)."""
    v = v.strip()
    if v in ("강수없음", "-", ""):
        return 0.0
    nums = [float(n) for n in re.findall(r"\d+(?:\.\d+)?", v)]
    if not nums:
        return 0.0
    if "미만" in v:
        return 0.5
    return max(nums)


def fetch(key: str, now: datetime | None = None) -> list[dict]:
    now = now or datetime.now(ZoneInfo("Asia/Seoul"))
    bd, bt = base_time(now)
    nx, ny = os.getenv("SAFEBRIDGE_KMA_NX", "60"), os.getenv("SAFEBRIDGE_KMA_NY", "127")
    ck = (bd, bt, nx, ny)
    if ck in _cache:
        return _cache[ck]
    params = {"serviceKey": key, "pageNo": 1, "numOfRows": 1000, "dataType": "JSON",
              "base_date": bd, "base_time": bt, "nx": nx, "ny": ny}
    r = httpx.get(URL, params=params, timeout=10)
    r.raise_for_status()
    try:
        body = r.json()["response"]
    except ValueError:  # 키 오류 등은 JSON 요청에도 XML 로 온다
        m = re.search(r"<returnAuthMsg>(.*?)</returnAuthMsg>|<resultMsg>(.*?)</resultMsg>", r.text)
        raise RuntimeError(f"기상청 응답 오류: {(m and (m.group(1) or m.group(2))) or r.text[:120]}")
    code = body["header"]["resultCode"]
    if code != "00":
        raise RuntimeError(f"기상청 응답 오류 {code}: {body['header'].get('resultMsg')}")
    items = body["body"]["items"]["item"]
    _cache.clear()
    _cache[ck] = items
    return items


def summarize(items: list[dict], day: str) -> dict:
    target = date.fromisoformat(day).strftime("%Y%m%d")
    rows = [i for i in items if i["fcstDate"] == target]
    if not rows:
        raise ValueError("해당 날짜 예보 없음(단기예보는 3일 이내)")

    def raw(cat):
        return [i["fcstValue"] for i in rows if i["category"] == cat]

    def num(cat):
        out = []
        for v in raw(cat):
            try:
                out.append(float(v))
            except ValueError:
                pass
        return out

    wsd, tmp = num("WSD"), num("TMP")
    tmn, tmx = num("TMN"), num("TMX")
    pcp = [parse_pcp(v) for v in raw("PCP")]
    pty = [PTY[v] for v in raw("PTY") if v in PTY]
    sky = [SKY[v] for v in raw("SKY") if v in SKY]
    sky_text = pty[0] if pty else (max(set(sky), key=sky.count) if sky else "")
    # 단기예보에는 순간풍속이 없어 풍속 최대값 × 1.5 를 순간풍속 추정치로 쓴다(보수적 가정)
    return {"date": day, "source": "기상청 단기예보", "wind_gust": round(max(wsd or [0]) * 1.5, 1),
            "wind_speed": max(wsd or [0]), "rain_mm_h": max(pcp or [0]),
            "temp_min": min(tmn or tmp or [0]), "temp_max": max(tmx or tmp or [0]), "sky": sky_text}


def daily_forecast(day: str, key: str) -> dict:
    return summarize(fetch(key), day)
