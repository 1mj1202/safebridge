from app.services import glossary, patterns, weather


def test_pattern_excludes_low_confidence_and_sorts():
    p = patterns.pattern("거푸집")
    assert p["total"] > 0 and p["accident_types"][0]["type"] == "추락"
    assert sum(t["count"] for t in p["accident_types"]) == p["total"]


def test_similar_filters_by_object():
    res = patterns.similar("거푸집 추락 개구부", k=2, trade="거푸집", accident_type="추락", cause_object="개구부")
    assert res and all(c["cause_object"] == "개구부" for c in res)


def test_weather_wind_rule():
    j = weather.judge("2026-11-24", ["거푸집", "양중"])
    codes = {a["code"] for a in j["alerts"]}
    assert "wind_high" in codes and "cold" in codes


def test_glossary_term_check():
    r = glossary.check_terms("개구부로 추락", "Ngã từ trên cao xuống lỗ mở sàn", "vi")
    assert r["rate"] == 1.0
    r = glossary.check_terms("개구부로 추락", "Ngã xuống lỗ", "vi")
    assert r["kept"] == 0 and r["total"] == 2


def test_eval_structuring_accuracy():
    from scripts.eval_structuring import evaluate

    labels = [{"case_id": "A", "trade": "거푸집", "accident_type": "추락", "cause_object": "개구부"},
              {"case_id": "B", "trade": "철근", "accident_type": "낙하", "cause_object": "철근"}]
    preds = {"A": {"trade": "거푸집", "accident_type": "추락", "cause_object": "슬래브 단부"},
             "B": {"trade": "철근", "accident_type": "협착", "cause_object": "철근"}}
    r = evaluate(labels, preds)
    assert r["trade"]["accuracy"] == 1.0 and r["accident_type"]["accuracy"] == 0.5


def test_structure_extract_validates(monkeypatch):
    from scripts import structure_accidents as sa

    class P:
        name = "fake"

        def complete(self, system, prompt):
            return '{"trade":"거푸집","work":"설치","accident_type":"추락","cause_object":"개구부",' \
                   '"causes":["덮개 미고정"],"measures":["덮개 고정"],"confidence":0.9}'

    monkeypatch.setattr(sa, "get_provider", lambda: P())
    assert sa.extract({"사고경위": "x"})["cause_object"] == "개구부"

    class Bad(P):
        def complete(self, system, prompt):
            return "모르겠어요"

    monkeypatch.setattr(sa, "get_provider", lambda: Bad())
    assert sa.extract({})["confidence"] == 0.0
