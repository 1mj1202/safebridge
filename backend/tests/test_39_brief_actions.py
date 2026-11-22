"""구역 브리핑 행동 카드 — 위험 카드와 체크리스트를 합치고, 같은 안내는 한 번만."""
from app.services import brief_actions, glossary, zone_brief

ITEMS = [
    {"id": "i1", "key": "fall_edge", "level": "상", "checks": ["check.harness", "check.guardrail", "check.helmet"]},
    {"id": "i2", "key": "fall_opening", "level": "상", "checks": ["check.opening_cover", "check.harness"]},
    {"id": "i3", "key": "collapse", "level": "중", "checks": ["check.shoring"]},
]


def _draft(restricted=False, items=ITEMS):
    return {"items": items, "briefings": [{
        "zone": "A동 3F-a", "storey": "3F", "restricted": restricted, "teams": [], "langs": ["ko"], "weather": [],
        "safety": [{"item_id": i["id"]} for i in items]}]}


def test_cards_merge_checks_and_keep_timing():
    for lang in ("ko", "vi"):
        b = zone_brief.brief(_draft(), "A동 3F-a", lang)
        a = b["actions"]
        assert [c["hazard"] for c in a] == [glossary.phrase(f"hazard.{k}", lang) for k in ("fall_edge", "fall_opening", "collapse")]
        assert [(c["when"], c["do"]) for c in a] == [
            (glossary.phrase(f"when.{k}", lang), glossary.phrase(f"act.{k}", lang)) for k in ("fall_edge", "fall_opening", "collapse")]
        assert all(not c["extra"] for c in a)  # 난간·덮개·동바리 확인은 카드 행동에 이미 있음
        assert b["ppe"] == [glossary.phrase("ppe.harness", lang), glossary.phrase("ppe.helmet", lang)]  # 안전대는 한 번만
        assert b["ban"] is None
    ko = zone_brief.brief(_draft(), "A동 3F-a", "ko")["actions"]
    assert ko[0]["when"] == "작업 시작 전" and "안전난간" in ko[0]["do"]
    assert ko[1]["when"] == "자재를 옮기기 전" and "고정하고 표시" in ko[1]["do"]


def test_leftover_checks_stay_on_their_card():
    items = [{"id": "f", "key": "falling_object", "level": "상", "checks": ["check.no_entry_below", "check.tool_tether", "check.helmet"]}]
    b = zone_brief.brief(_draft(items=items), "A동 3F-a", "ko")
    assert b["actions"][0]["extra"] == [glossary.phrase("check.tool_tether", "ko")]
    assert b["ppe"] == [glossary.phrase("ppe.helmet", "ko")]


def test_restricted_zone_shows_ban_first_no_cards():
    items = [{"id": "f", "key": "falling_object", "level": "상", "checks": ["check.no_entry_below", "check.helmet"]}]
    for lang in ("ko", "vi"):
        b = zone_brief.brief(_draft(True, items), "A동 3F-a", lang)
        assert b["ban"]["text"] == glossary.phrase("chat.restricted", lang)
        assert b["ban"]["until"] == glossary.phrase("chat.restricted_final", lang)
        assert b["actions"] == [] and b["ppe"] == []


def test_memo_hidden_only_when_it_repeats():
    shown = {"check.harness", "check.helmet", "check.guardrail"}
    assert brief_actions.memo_repeats("오늘은 바람이 강하니 안전대를 꼭 거세요", shown)
    assert not brief_actions.memo_repeats("단부 작업 전 안전대를 거세요", shown)  # 작업 조건이 붙음
    assert not brief_actions.memo_repeats("14시 이후 3F 양중 금지", shown)  # 새 시간·작업 제한
    assert not brief_actions.memo_repeats("점심 후 집합", shown)  # 모르는 내용은 보여 준다
    assert not brief_actions.memo_repeats("신호수 신호에 따르세요", shown)  # 화면에 없는 안내


def test_new_phrases_all_langs():
    p = glossary.load_json("phrases.json")["phrases"]
    for k in ("fall_edge", "fall_opening", "collapse", "falling_object", "caught"):
        assert set(p[f"when.{k}"]) == set(p[f"act.{k}"]) == set(glossary.load_json("phrases.json")["langs"])
