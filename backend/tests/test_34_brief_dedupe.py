"""구역 브리핑 반복 줄이기 — 대책 줄·관리자 한마디가 이미 말하는 확인 항목은 체크 박스에서 뺀다."""
from app.services import glossary, zone_brief

ITEMS = [
    {"id": "i1", "key": "fall_edge", "level": "상", "checks": ["check.harness", "check.guardrail", "check.helmet"]},
    {"id": "i2", "key": "fall_opening", "level": "상", "checks": ["check.opening_cover"]},
    {"id": "i3", "key": "collapse", "level": "중", "checks": ["check.shoring"]},
]
DRAFT = {"items": ITEMS, "briefings": [{
    "zone": "A동 3F-a", "storey": "3F", "restricted": False, "teams": [], "langs": ["ko"], "weather": [],
    "safety": [{"item_id": i["id"]} for i in ITEMS]}]}


def test_measure_lines_cover_checks():
    b = zone_brief.brief(DRAFT, "A동 3F-a", "ko")
    assert b["checks"] == [glossary.phrase("check.harness", "ko"), glossary.phrase("check.helmet", "ko")]


def test_memo_covers_harness():
    skip = zone_brief.memo_skips("오늘은 바람이 강하니 안전대를 꼭 거세요")
    assert skip == {"check.harness"}
    b = zone_brief.brief(DRAFT, "A동 3F-a", "vi", skip=skip)
    assert b["checks"] == [glossary.phrase("check.helmet", "vi")]
    assert zone_brief.memo_skips("") == set()
