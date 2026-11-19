"""공간 위험 계산 (결정론적) — 진행 작업 + IFC 객체 → 추락·낙하 위험 영역(박스).

규칙(시연 기준, 근거는 산업안전보건기준에 관한 규칙 제42·43·14조):
- 슬래브 작업(거푸집·철근·타설) 층: 슬래브 외곽 단부 안쪽 EDGE_BAND m 띠 = 추락(빨강)
- 같은 슬래브의 개구부 둘레 OPENING_BAND m = 추락(빨강)
- 작업 슬래브 바로 아래 층 내부 = 낙하(주황, 하부 작업 통제)
- 개구부 직하부 모든 아래층 = 낙하(주황)
- 건물 외곽 지상 DROP_BAND m = 낙하(주황, 상부 작업 중 통행 통제)
"""
from __future__ import annotations

from dataclasses import asdict, dataclass

from .ifc_extract import Element, Model

EDGE_BAND = 1.0
OPENING_BAND = 0.6
DROP_BAND = 2.0
ZONE_HEIGHT = 1.2
SLAB_TRADES = {"거푸집", "철근", "타설"}


@dataclass
class Zone:
    id: str
    kind: str            # fall | drop
    label: str
    storey: str
    min: tuple[float, float, float]
    max: tuple[float, float, float]
    element_tags: list[str]
    rule: str            # 근거 조문 ID (law 서비스에서 조회)
    task_ids: list[str]

    def to_dict(self) -> dict:
        return asdict(self)


def _r(v) -> tuple[float, float, float]:
    return tuple(round(float(x), 3) for x in v)


def _edge_bands(slab: Element, band: float, z0: float, z1: float) -> list[tuple[str, tuple, tuple]]:
    (x0, y0, _), (x1, y1, _) = slab.bbox_min, slab.bbox_max
    return [
        ("남측", (x0, y0, z0), (x1, y0 + band, z1)),
        ("북측", (x0, y1 - band, z0), (x1, y1, z1)),
        ("서측", (x0, y0 + band, z0), (x0 + band, y1 - band, z1)),
        ("동측", (x1 - band, y0 + band, z0), (x1, y1 - band, z1)),
    ]


def compute(model: Model, tasks: list[dict]) -> list[Zone]:
    """tasks: [{id, trade, storey, ...}] — 해당 날짜에 진행 중인 작업."""
    zones: list[Zone] = []
    elev = {s["name"]: s["elevation"] for s in model.storeys}

    slab_work: dict[str, list[str]] = {}
    for t in tasks:
        if t["trade"] in SLAB_TRADES:
            slab_work.setdefault(t["storey"], []).append(t["id"])

    for storey, task_ids in sorted(slab_work.items()):
        slab = model.by_tag(f"SLB-{storey}")
        if slab is None:
            continue
        top = slab.bbox_max[2]
        for side, mn, mx in _edge_bands(slab, EDGE_BAND, top, top + ZONE_HEIGHT):
            zones.append(Zone(
                id=f"Z-FALL-{storey}-EDGE-{side}", kind="fall", label=f"{storey} 슬래브 {side} 단부 추락",
                storey=storey, min=_r(mn), max=_r(mx), element_tags=[slab.tag],
                rule="LAW-42", task_ids=task_ids,
            ))
        openings = [e for e in model.elements if e.ifc_class == "IfcOpeningElement" and e.storey == storey]
        for op in openings:
            (x0, y0, _), (x1, y1, _) = op.bbox_min, op.bbox_max
            b = OPENING_BAND
            zones.append(Zone(
                id=f"Z-FALL-{storey}-{op.tag}", kind="fall", label=f"{op.name} 둘레 추락",
                storey=storey, min=_r((x0 - b, y0 - b, top)), max=_r((x1 + b, y1 + b, top + ZONE_HEIGHT)),
                element_tags=[op.tag, slab.tag], rule="LAW-43", task_ids=task_ids,
            ))
            # 개구부 직하부: 지상까지 모든 아래층
            zones.append(Zone(
                id=f"Z-DROP-{storey}-{op.tag}-SHAFT", kind="drop", label=f"{op.name} 직하부 낙하",
                storey=storey, min=_r((x0, y0, 0.0)), max=_r((x1, y1, slab.bbox_min[2])),
                element_tags=[op.tag], rule="LAW-14", task_ids=task_ids,
            ))
        # 작업 슬래브 바로 아래 층 내부(동바리·하부 작업 구간)
        base = elev.get(storey, 0.0)
        (x0, y0, _), (x1, y1, _) = slab.bbox_min, slab.bbox_max
        zones.append(Zone(
            id=f"Z-DROP-{storey}-BELOW", kind="drop", label=f"{storey} 슬래브 하부 낙하(하부 작업 통제)",
            storey=storey, min=_r((x0, y0, base)), max=_r((x1, y1, base + 0.15)),
            element_tags=[slab.tag], rule="LAW-14", task_ids=task_ids,
        ))
        # 외곽 지상 낙하 구간
        for side, mn, mx in _edge_bands(
            Element("", "", "", "", (x0 - DROP_BAND, y0 - DROP_BAND, 0.0), (x1 + DROP_BAND, y1 + DROP_BAND, 0.0)),
            DROP_BAND, 0.0, 0.1,
        ):
            zones.append(Zone(
                id=f"Z-DROP-{storey}-GROUND-{side}", kind="drop", label=f"외곽 {side} 지상 낙하(통행 통제)",
                storey=storey, min=_r(mn), max=_r(mx), element_tags=[slab.tag],
                rule="LAW-14", task_ids=task_ids,
            ))
    return zones
