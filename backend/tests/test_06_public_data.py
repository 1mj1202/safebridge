"""공공데이터 변환·실데이터 근거(프로파일·KOSHA GUIDE·유의어) 반영."""
import datetime

from app.agent import runner
from app.llm.mock import MockProvider
from app.services import guides, patterns, risk_profile
from scripts.public_data import mapping as m
from scripts.public_data.cases import sif
from scripts.public_data.common import grade

SIF_HEAD = "연번,공종,작업명,단위작업명,재해종류,재해개요,기인물,재해유발요인,위험성감소대책(예시)\n"


def test_mapping_rules():
    assert m.cause_object("슬라브단부") == "슬래브 단부"
    assert m.cause_object("바닥개구부(자재인양구 등)") == "개구부"
    assert m.sif_trade("2.1.2 거푸집 동바리 조립", "거푸집") == "거푸집"
    assert m.sif_trade("2.1.4 거푸집 동바리 인양", "거푸집") == "양중"
    assert m.sif_trade("4.1.1 도장", "이동식크레인") == "양중"
    assert m.accident_type("깔림", "거푸집·동바리") == "붕괴"
    assert m.accident_type("끼임") == "협착"
    assert grade("H(4)") == 4 and grade("없음") is None


def test_sif_conversion(tmp_path):
    (tmp_path / "07_안전보건공단_사망사고.csv").write_text(
        SIF_HEAD + '7,2. 철근콘크리트 공사,2.1 거푸집 작업,2.1.2 거푸집 동바리 조립,추락,'
        '"2020년 3월경 ○○ 현장 3층 슬라브 단부에서 추락",슬라브단부,안전난간 미설치,"▶ 안전난간 설치\n▶ 안전대 착용"\n',
        encoding="utf-8")
    [c] = sif(tmp_path)
    assert c["case_id"] == "SIF-0007" and c["trade"] == "거푸집" and c["date"] == "2020-03"
    assert c["cause_object"] == "슬래브 단부" and c["measures"] == ["안전난간 설치", "안전대 착용"]
    assert c["virtual"] is False and c["severity"] == "사망"


def test_real_data_loaded():
    assert not any(c.get("virtual") for c in patterns.cases())
    assert patterns.get_case("SIF-0001")
    assert risk_profile.get("거푸집", "추락")["n"] > 0
    assert all(guides.get(g) for k in guides.HAZARD_GUIDES for g in guides.for_hazard(k))


def test_synonym_expansion():
    assert "넘어짐" in patterns.expand("전도 사고")
    assert patterns.expand("없는낱말") == "없는낱말"


def test_draft_uses_profile_and_guides():
    d = runner.run(MockProvider(), "내일 3층 위험성평가 초안", datetime.date(2026, 11, 23))["draft"]
    edge = next(i for i in d["items"] if i["key"] == "fall_edge")
    assert edge["profile"]["id"] == "RP-거푸집-추락" and edge["level"] == "상"
    assert edge["evidence"]["guides"] and edge["evidence"]["cases"]
    assert all(patterns.get_case(c)["cause_object"] == "슬래브 단부" for c in edge["evidence"]["cases"])
    assert d["sources"]["hourly"]["peak"]


def test_new_langs_phrases_keep_terms():
    """모든 언어 문장이 사전 용어를 100% 유지."""
    from app.services import glossary
    from app.services.data_store import load_json

    for key, p in load_json("phrases.json")["phrases"].items():
        for lang in ("en", "zh", "vi", "th", "ne", "mn", "lo", "tet", "my"):
            assert glossary.check_terms(p["ko"], p[lang], lang)["rate"] == 1.0, (key, lang)
