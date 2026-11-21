"""예방 영상(3D 사고 재현) 장면 목록: 사고 4종만, 순위 순서, 근로자 언어 자막."""
from app.services import zone_brief


def test_sims_keep_order_and_only_four_kinds():
    s = zone_brief.sims(["falling_object", "caught", "fall_edge", "falling_object"], "ko")
    assert [x["kind"] for x in s] == ["falling_object", "fall_edge"]
    assert s[1]["accident"] == "슬래브 단부에서 추락"
    assert "안전난간" in s[1]["measure"]


def test_sims_translated():
    s = zone_brief.sims(["collapse", "fall_opening"], "vi")
    assert [x["kind"] for x in s] == ["collapse", "fall_opening"]
    assert "cây chống" in s[0]["accident"]
    assert all(x["measure"] for x in s)
