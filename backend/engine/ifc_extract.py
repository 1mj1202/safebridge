"""IFC → 3D 뷰어용 메시 + 공간 위험 계산용 객체 정보 추출 (웹/DB 독립)."""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import ifcopenshell
import ifcopenshell.geom
import ifcopenshell.util.element
import numpy as np

TARGET_CLASSES = ("IfcSlab", "IfcColumn", "IfcBeam", "IfcWall", "IfcOpeningElement")


@dataclass
class Element:
    tag: str
    ifc_class: str
    name: str
    storey: str
    bbox_min: tuple[float, float, float]
    bbox_max: tuple[float, float, float]
    vertices: list[float] = field(default_factory=list)  # 평탄화된 xyz (뷰어용)
    faces: list[int] = field(default_factory=list)

    def summary(self) -> dict:
        return {
            "tag": self.tag, "ifc_class": self.ifc_class, "name": self.name, "storey": self.storey,
            "bbox_min": self.bbox_min, "bbox_max": self.bbox_max,
        }


@dataclass
class Model:
    storeys: list[dict]          # [{name, elevation}]
    elements: list[Element]

    def by_tag(self, tag: str) -> Element | None:
        return next((e for e in self.elements if e.tag == tag), None)


def _storey_name(el) -> str:
    container = ifcopenshell.util.element.get_container(el)
    if container is None and el.is_a("IfcOpeningElement") and el.VoidsElements:
        container = ifcopenshell.util.element.get_container(el.VoidsElements[0].RelatingBuildingElement)
    return container.Name if container else ""


def load(path: Path) -> Model:
    f = ifcopenshell.open(str(path))
    settings = ifcopenshell.geom.settings()
    settings.set("use-world-coords", True)
    # 개구부를 뺀 슬래브 형상(뷰어) — 개구부 자체도 별도 객체로 추출
    elements: list[Element] = []
    products = [p for c in TARGET_CLASSES for p in f.by_type(c)]
    it = ifcopenshell.geom.iterator(settings, f, include=products)
    if it.initialize():
        while True:
            shape = it.get()
            el = f.by_id(shape.id)
            v = np.array(shape.geometry.verts, dtype=float).reshape(-1, 3)
            elements.append(Element(
                tag=el.Tag or el.GlobalId, ifc_class=el.is_a(), name=el.Name or "",
                storey=_storey_name(el),
                bbox_min=tuple(round(float(x), 3) for x in v.min(axis=0)),
                bbox_max=tuple(round(float(x), 3) for x in v.max(axis=0)),
                vertices=[round(float(x), 3) for x in v.ravel()],
                faces=list(shape.geometry.faces),
            ))
            if not it.next():
                break
    storeys = sorted(
        ({"name": s.Name, "elevation": round(float(s.Elevation or 0.0), 3)} for s in f.by_type("IfcBuildingStorey")),
        key=lambda s: s["elevation"],
    )
    elements.sort(key=lambda e: e.tag)
    return Model(storeys=storeys, elements=elements)
