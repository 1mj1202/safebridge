"""강풍 경고: 관리자 승인 문구와 근로자 문구(한국어·다국어)가 같은 작업·조건·지시를 담는다. 번역 뜻 검사."""
from app.services import glossary, translate, weather_text

LANGS = glossary.LANGS


def _wind_item(hazard: str | None = None) -> dict:
    text = glossary.phrase("weather.wind_high", "ko", value=11.8, limit="10")
    return {"id": "H6", "key": "weather_wind_high", "hazard": hazard or text, "level": "중",
            "weather": {"phrase": "weather.wind_high", "value": 11.8}}


def test_admin_and_worker_korean_are_the_same_sentence(client):
    a = client.post("/api/agent/assess", json={"query": "내일 3층 작업 위험 알려줘", "date": "2026-11-24"}).json()
    wind = next(i for i in a["draft"]["items"] if i["key"] == "weather_wind_high")
    assert "양중" in wind["hazard"] and "단부" in wind["hazard"] and "작업중지 검토" in wind["hazard"]
    client.post(f"/api/assessments/{a['id']}/approve")
    t = client.post(f"/api/assessments/{a['id']}/publish", json={}).json()
    zone = next(b["zone"] for b in a["draft"]["briefings"] if any(w["item_id"] == wind["id"] for w in b["weather"]))
    ko = client.get(f"/api/w/{t['token']}/brief", params={"zone": zone, "lang": "ko"}).json()
    lines = [l["text"] for s in ko["sections"] if s["type"] == "weather" for l in s["lines"]]
    assert wind["hazard"] in lines


def test_every_language_keeps_condition_numbers():
    it = _wind_item()
    for lang in LANGS:
        line = weather_text.line(it, lang)
        assert "11.8" in line and "10" in line, lang
    assert weather_text.line(it, "ko") == it["hazard"]


def test_legacy_wording_still_uses_the_fixed_sentence():
    # 예전 초안(11/20 발행본)의 문구도 같은 요소를 담고 있어 고정 번역을 쓴다
    it = _wind_item("순간풍속 11.8m/s(10m/s 초과): 양중·단부 작업중지 검토")
    assert weather_text.follows_bank(it)
    assert weather_text.line(it, "en") == glossary.phrase("weather.wind_high", "en", value=11.8, limit="10")


def test_edited_wording_is_shown_as_approved_not_replaced():
    it = _wind_item("순간풍속 11.8m/s: 단부 작업 즉시 중지")
    assert weather_text.needs_translation(it)
    assert weather_text.line(it, "ko") == "순간풍속 11.8m/s: 단부 작업 즉시 중지"
    # 뜻 검사를 통과한 번역이 없으면 승인 원문(한국어)을 그대로 보여 준다
    assert weather_text.line(it, "my").endswith("순간풍속 11.8m/s: 단부 작업 즉시 중지")
    ok = {"my": {"ok": True, "translated": "MY-TEXT"}}
    assert weather_text.line(it, "my", ok) == "MY-TEXT"


def test_meaning_check_catches_changed_instruction():
    src = "오늘은 바람이 강하니 안전대를 꼭 거세요"
    bad = translate.meaning_check(src, "…", "오늘 바람이 더 강해질 거야. 케이블을 정말로 고정해라.")
    assert not bad["ok"] and "안전대" in bad["missing"]
    good = translate.meaning_check(src, "…", "오늘 바람이 강해서 안전대를 꼭 착용하세요.")
    assert good["ok"]
    wind = "순간풍속 11.8m/s · 현장 기준 10m/s 초과: 양중·단부 작업중지 검토"
    lost = translate.meaning_check(wind, "Gusts 11.8 m/s. Stop work", "순간풍속 11.8m/s. 작업중지")
    assert not lost["ok"] and {"10", "양중", "단부", "검토"} <= set(lost["missing"])


def test_old_publish_records_are_rechecked():
    legacy = {"source": "오늘은 바람이 강하니 안전대를 꼭 거세요", "translated": "x", "ok": True,
              "back": "오늘 바람이 더 강해질 거야. 케이블을 정말로 고정해라."}
    assert translate.still_ok(legacy) is False
    assert translate.still_ok({**legacy, "back": "오늘 바람이 강하니 안전대를 꼭 거세요"}) is True
