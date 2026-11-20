"""구역·팀 배정, 공종키, 위험 순위(P×S×w+기상)."""
from app.agent import ranking
from app.agent.tools import spatial_tool
from app.services import crosswalk, site, stats


def _item(key, p, s, trades=("거푸집",)):
    return {"key": key, "trades": list(trades), "level": "", "evidence": {"zones": []},
            "profile": {"likelihood": p, "severity": s}}


def test_work_keys_and_weight():
    assert crosswalk.work_key("거푸집") == "RC-FORM" and crosswalk.work_key("양생") is None
    assert stats.weight("철근콘크리트공사") == 1.27 and stats.weight(None) == 1.0


def test_site_zones():
    assert site.zone_names("3F") == ["A동 3F-a", "A동 3F-b"]
    assert site.zones_for_box("3F", (0, 0, 0), (5, 5, 0)) == ["A동 3F-a"]
    assert site.zones_for_box("3F", (0, 0, 0), (30, 1, 0)) == ["A동 3F-a", "A동 3F-b"]
    below = {"id": "Z-DROP-3F-BELOW", "storey": "3F", "min": (0, 0, 0), "max": (30, 18, 0)}
    assert spatial_tool.site_zones(below) == ["A동 2F-a", "A동 2F-b"]
    assert spatial_tool.site_zones({**below, "id": "Z-DROP-3F-GROUND-남측"}) == ["A동 외곽 지상"]


def test_ranking_weather_bonus_and_order():
    wind = [{"code": "wind_high", "level": "warn", "affects": ["거푸집"]}]
    items = ranking.apply([_item("collapse", 2.5, 3.7), _item("fall_edge", 3.0, 3.7)], wind)
    assert [i["key"] for i in items] == ["fall_edge", "collapse"]
    assert items[0]["rank_basis"]["weather"] == 1 and items[1]["rank_basis"]["weather"] == 0
    assert items[0]["id"] == "H1" and items[0]["risk_rank"] == 1
    assert ranking.level(3.0, 3.7) == "상" and ranking.level(2.5, 3.0) == "중" and ranking.level(2, 3) == "하"
