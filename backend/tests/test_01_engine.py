"""샘플 IFC·공정·공간 위험 (웹/DB 독립)."""
from engine import schedule_gen, spatial_risk
from app.services.bim import get_model


def test_sample_model_has_floors_slabs_openings():
    m = get_model()
    assert [s["name"] for s in m.storeys] == ["1F", "2F", "3F", "4F", "5F"]
    slab = m.by_tag("SLB-3F")
    assert slab.bbox_min[:2] == (0.0, 0.0) and slab.bbox_max[:2] == (30.0, 18.0)
    assert len([e for e in m.elements if e.ifc_class == "IfcOpeningElement" and e.storey == "3F"]) == 2


def test_schedule_anchor_3f_formwork_on_demo_day():
    tasks = {t["id"]: t for t in schedule_gen.generate()}
    assert tasks["T-3F-FORM"]["start"] == "2026-11-24"
    # 일요일 작업 없음
    from datetime import date
    assert all(date.fromisoformat(t["start"]).weekday() != 6 for t in tasks.values())


def test_spatial_risk_edges_openings_and_drop_zones():
    m = get_model()
    zones = spatial_risk.compute(m, [{"id": "T", "trade": "거푸집", "storey": "3F"}])
    kinds = {z.id: z.kind for z in zones}
    assert sum(1 for i in kinds if "-EDGE-" in i) == 4
    assert sum(1 for i in kinds if i.startswith("Z-FALL-3F-OPN")) == 2
    assert all(kinds[i] == "drop" for i in kinds if "SHAFT" in i or "GROUND" in i)
    edge = next(z for z in zones if z.id == "Z-FALL-3F-EDGE-남측")
    assert edge.min[2] == m.by_tag("SLB-3F").bbox_max[2]  # 슬래브 상면에 띠
    assert edge.rule == "LAW-42"


def test_no_zones_for_curing_only():
    assert spatial_risk.compute(get_model(), [{"id": "T", "trade": "양생", "storey": "2F"}]) == []
