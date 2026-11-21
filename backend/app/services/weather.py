"""기상 판정 — 예보값(기상청 또는 가상) × 작업중지 기준(결정론적).

기준(시연용, 근거 조문 ID 포함):
- 순간풍속 10m/s 초과: 타워크레인 설치·해체 중지, 고소·양중 작업 중지 검토 (LAW-37)
- 순간풍속 20m/s 초과: 타워크레인 운전 중지 (LAW-37)
- 강수 1mm/h 이상: 고소작업 주의, 타설 일정 재검토 (LAW-37)
- 최저기온 0℃ 이하: 결빙·미끄럼 주의, 한중 콘크리트 관리
"""
from __future__ import annotations

import logging

from app.core.config import get_settings

from .data_store import load_json

log = logging.getLogger(__name__)


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
    alerts = []
    gust, rain, tmin = fc["wind_gust"], fc["rain_mm_h"], fc["temp_min"]
    if gust > 20:
        alerts.append({"code": "wind_crane_stop", "level": "stop", "phrase": "weather.wind", "value": gust,
                       "text": f"순간풍속 {gust}m/s: 타워크레인 운전 작업중지", "rule": "LAW-37"})
    elif gust > 10:
        alerts.append({"code": "wind_high", "level": "warn", "phrase": "weather.wind", "value": gust,
                       "text": f"순간풍속 {gust}m/s(10m/s 초과): 양중·단부 작업중지 검토", "rule": "LAW-37",
                       "affects": [t for t in trades if t in ("양중", "거푸집", "철근")]})
    if rain >= 1:
        alerts.append({"code": "rain", "level": "warn", "phrase": "weather.rain", "value": rain,
                       "text": f"시간당 강수 {rain}mm: 미끄럼 주의, 타설 일정 재검토", "rule": "LAW-37",
                       "affects": [t for t in trades if t in ("타설", "거푸집", "철근")]})
    if tmin <= 0:
        alerts.append({"code": "cold", "level": "info", "phrase": "weather.cold", "value": tmin,
                       "text": f"최저기온 {tmin}℃: 결빙·미끄럼 주의", "rule": None})
    return {"forecast": fc, "alerts": alerts}
