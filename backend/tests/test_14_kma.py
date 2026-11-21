from datetime import datetime

import pytest

from app.services import kma, weather


def _items(day="20261124"):
    rows = []
    for h, wsd, pcp, tmp, sky, pty in [("0600", "3.1", "강수없음", "-1", "1", "0"),
                                       ("1200", "7.9", "30.0~50.0mm", "6", "4", "1"),
                                       ("1500", "5.0", "1mm 미만", "7", "3", "0")]:
        for cat, v in [("WSD", wsd), ("PCP", pcp), ("TMP", tmp), ("SKY", sky), ("PTY", pty)]:
            rows.append({"fcstDate": day, "fcstTime": h, "category": cat, "fcstValue": v})
    rows.append({"fcstDate": day, "fcstTime": "0600", "category": "TMN", "fcstValue": "-2.0"})
    return rows


def test_parse_pcp_forms():
    assert kma.parse_pcp("강수없음") == 0.0
    assert kma.parse_pcp("1mm 미만") == 0.5
    assert kma.parse_pcp("2.5mm") == 2.5
    assert kma.parse_pcp("30.0~50.0mm") == 50.0
    assert kma.parse_pcp("50.0mm 이상") == 50.0


def test_summarize_real_shape():
    s = kma.summarize(_items(), "2026-11-24")
    assert s["source"] == "기상청 단기예보"
    assert s["wind_gust"] == round(7.9 * 1.5, 1) and s["rain_mm_h"] == 50.0
    assert s["temp_min"] == -2.0 and s["temp_max"] == 7.0 and s["sky"] == "비"
    with pytest.raises(ValueError):
        kma.summarize(_items(), "2026-12-01")


def test_base_time_before_first_release():
    assert kma.base_time(datetime(2026, 11, 21, 2, 5)) == ("20261120", "2300")
    assert kma.base_time(datetime(2026, 11, 21, 16, 0)) == ("20261121", "1400")


def test_failure_falls_back_to_mock(monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "kma_service_key", "bad")

    def boom(*a, **k):
        raise RuntimeError("SERVICE_KEY_IS_NOT_REGISTERED_ERROR")

    monkeypatch.setattr(kma, "daily_forecast", boom)
    assert weather.forecast("2026-11-24")["source"] == "가상 예보"


def test_demo_scenario_day_keeps_mock_but_other_days_use_kma(monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "kma_service_key", "k")
    monkeypatch.setattr(kma, "daily_forecast", lambda day, key: {"date": day, "source": "기상청 단기예보",
                        "wind_gust": 1.0, "rain_mm_h": 0.0, "temp_min": 5.0, "temp_max": 9.0, "sky": "맑음"})
    assert weather.forecast("2026-11-24")["wind_gust"] == 11.8  # 시연 강풍 유지
    assert weather.forecast("2026-11-28")["source"] == "기상청 단기예보"
    monkeypatch.setattr(get_settings(), "demo_today", "")
    assert weather.forecast("2026-11-24")["source"] == "기상청 단기예보"
