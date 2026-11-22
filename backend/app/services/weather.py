"""기상 판정 — 예보값(기상청 또는 가상) × 작업중지 기준(결정론적).

경고마다 근거 종류를 나눈다(basis):
- 법령: 산업안전보건기준에 관한 규칙 제37조
  ① 비·눈·바람 등 기상 불안정으로 위험이 예상되면 작업 중지(수치 없음)
  ② 순간풍속 10m/s 초과 타워크레인 설치·수리·점검·해체 중지, 15m/s 초과 타워크레인 운전 중지
- 현장 기준: 현장이 정한 관리 기준(법령 아님). 기본값은 아래 SITE_LIMITS, site.json "site_limits" 로 바꿀 수 있다.
  순간풍속 10m/s 초과 양중·단부 작업중지 검토 / 강수 1mm/h 이상 미끄럼 주의·타설 재검토
- 최저기온 0℃ 이하: 결빙·미끄럼 주의(참고)
"""
from __future__ import annotations

import logging

from app.core.config import get_settings

from . import glossary
from .data_store import load_json

log = logging.getLogger(__name__)


SITE_LIMITS = {"wind_ms": 10.0, "rain_mm_h": 1.0}
LAW_WIND_NOTE = "법령(제37조②): 타워크레인 설치·수리·점검·해체는 순간풍속 10m/s 초과, 운전은 15m/s 초과 시 중지"


def site_limits() -> dict:
    return {**SITE_LIMITS, **load_json("site.json").get("site_limits", {})}


def forecast(day: str) -> dict:
    s = get_settings()
    data = load_json("weather_mock.json")
    # 시연 날짜를 고정해 둔 동안에는 시나리오 날짜(강풍 등)를 가상 예보로 유지한다
    scenario = bool(s.demo_today) and day in data["days"]
    if s.kma_service_key and not scenario:
        try:
            from . import kma

            return kma.daily_forecast(day, s.kma_service_key)
        except Exception as e:  # 외부 API 실패 시 가상값으로
            log.warning("기상청 조회 실패, 가상 예보 사용: %s", e)
    return {"date": day, "source": "가상 예보", **data["days"].get(day, data["default"])}


def judge(day: str, trades: list[str]) -> dict:
    fc = forecast(day)
    lim = site_limits()
    alerts = []
    gust, rain, tmin = fc["wind_gust"], fc["rain_mm_h"], fc["temp_min"]
    # 관리자 문구와 근로자 문구는 같은 문장 은행 문장(한국어 = 관리자 문구)에서 나온다 — 대상 작업·조건·지시가 같게
    if gust > 15:
        alerts.append({"code": "wind_crane_stop", "level": "stop", "phrase": "weather.wind_stop", "value": gust,
                       "text": glossary.phrase("weather.wind_stop", "ko", value=gust), "rule": "LAW-37",
                       "basis": "법령", "legal": LAW_WIND_NOTE + " — 오늘 법정 중지 대상"})
    elif gust > lim["wind_ms"]:
        legal = LAW_WIND_NOTE + (" — 크레인 운전(양중)은 법정 중지 대상 아님, 설치·해체 작업이 있으면 중지 대상"
                                 if gust > 10 else " — 오늘 법정 중지 대상 아님")
        alerts.append({"code": "wind_high", "level": "warn", "phrase": "weather.wind_high", "value": gust,
                       "text": glossary.phrase("weather.wind_high", "ko", value=gust, limit=f"{lim['wind_ms']:g}"),
                       "rule": "LAW-37", "basis": "현장 기준", "legal": legal,
                       "affects": [t for t in trades if t in ("양중", "거푸집", "철근")]})
    if rain >= lim["rain_mm_h"]:
        alerts.append({"code": "rain", "level": "warn", "phrase": "weather.rain", "value": rain,
                       "text": f"시간당 강수 {rain}mm · 현장 기준 {lim['rain_mm_h']:g}mm 이상: 미끄럼 주의, 타설 일정 재검토",
                       "rule": "LAW-37", "basis": "현장 기준",
                       "legal": "법령(제37조①): 기상 불안정으로 위험이 예상되면 작업 중지 (강수 수치 기준은 없음)",
                       "affects": [t for t in trades if t in ("타설", "거푸집", "철근")]})
    if tmin <= 0:
        alerts.append({"code": "cold", "level": "info", "phrase": "weather.cold", "value": tmin,
                       "text": f"최저기온 {tmin}℃: 결빙·미끄럼 주의", "rule": None, "basis": "참고", "legal": None})
    return {"forecast": fc, "alerts": alerts}
