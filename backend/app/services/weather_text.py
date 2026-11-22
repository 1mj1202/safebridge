"""근로자에게 나가는 기상 경고 한 줄 — 관리자가 승인한 문구와 같은 뜻으로.

- 강풍 경고는 관리자 문구와 같은 문장 은행 문장(weather.wind_high / wind_stop)을 쓴다. 한국어는 관리자 문구 그대로,
  다른 언어는 팀이 고정 번역한 같은 문장이라 적용 작업·조건·최종 지시가 빠지지 않는다.
- 관리자가 문구를 고쳐 그 요소가 달라졌으면 고정 문장을 쓰지 않는다: 한국어는 승인 문구 그대로,
  다른 언어는 발행 때 뜻 검사를 통과한 번역만, 없으면 승인 원문(한국어)을 보여 준다.
- 비·추위 경고는 예전 문장 그대로.
"""
from __future__ import annotations

from . import glossary
from .weather import site_limits

PHRASE = {"weather_wind_high": "weather.wind_high", "weather_wind_crane_stop": "weather.wind_stop"}


def _kw(item: dict) -> dict:
    return {"value": item["weather"]["value"], "limit": f"{site_limits()['wind_ms']:g}"}


def elements(item: dict) -> list[str]:
    """승인 문구에 있어야 할 요소: 조건(수치), 적용 작업, 최종 지시."""
    kw = _kw(item)
    if item["key"] == "weather_wind_high":
        return [str(kw["value"]), kw["limit"], "양중", "단부", "작업중지 검토"]
    if item["key"] == "weather_wind_crane_stop":
        return [str(kw["value"]), "타워크레인", "작업중지"]
    return []


def follows_bank(item: dict) -> bool:
    """승인 문구가 문장 은행 문장과 같은 요소를 담고 있으면 고정 번역을 쓴다."""
    return item["key"] in PHRASE and all(e in item.get("hazard", "") for e in elements(item))


def needs_translation(item: dict) -> bool:
    return item["key"] in PHRASE and not follows_bank(item)


def line(item: dict, lang: str, translated: dict | None = None) -> str:
    w = item["weather"]
    key = PHRASE.get(item["key"])
    if key is None:
        return glossary.phrase(w["phrase"], lang, value=w["value"])
    approved = item.get("hazard", "")
    if lang == "ko":
        return approved  # 한국어 근로자 화면 = 관리자가 승인한 문구 그대로
    if follows_bank(item):
        return glossary.phrase(key, lang, **_kw(item))
    t = (translated or {}).get(lang)
    if t and t.get("ok"):
        return t["translated"]
    return f"{glossary.phrase('ui.approved_ko', lang)}: {approved}"
