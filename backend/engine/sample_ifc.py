"""샘플 IFC 생성기 — 가상의 5층 RC 골조 건물.

실제 현장 모델이 없으므로 시연용 모델을 코드로 만든다. 같은 입력이면 같은 모델이 나온다(재현 가능).
- 층: 1F~5F (층고 3.3m), 평면 30m x 18m, 기둥 6m 그리드
- 각 층 슬래브(t=200) + 개구부 2개(계단실·설비 샤프트)
- 각 객체 Tag 에 공정 연결용 ID(예: SLB-3F, COL-3F-A1)를 넣는다
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import ifcopenshell
import ifcopenshell.api.aggregate
import ifcopenshell.api.context
import ifcopenshell.api.feature
import ifcopenshell.api.geometry
import ifcopenshell.api.project
import ifcopenshell.api.root
import ifcopenshell.api.spatial
import ifcopenshell.api.unit
import numpy as np


@dataclass(frozen=True)
class BuildingSpec:
    floors: int = 5
    floor_height: float = 3.3
    width: float = 30.0   # X
    depth: float = 18.0   # Y
    grid: float = 6.0
    slab_thickness: float = 0.2
    column_size: float = 0.5
    # 개구부: (이름, x, y, 폭, 깊이)
    openings: tuple = (("계단실", 1.0, 13.0, 4.0, 4.0), ("설비샤프트", 21.5, 8.0, 2.0, 2.0))


def _place(f, body, element, x: float, y: float, z: float) -> None:
    m = np.eye(4)
    m[:3, 3] = (x, y, z)
    ifcopenshell.api.geometry.edit_object_placement(f, product=element, matrix=m, is_si=True)
    ifcopenshell.api.geometry.assign_representation(f, product=element, representation=body)


def build(spec: BuildingSpec = BuildingSpec()) -> ifcopenshell.file:
    f = ifcopenshell.api.project.create_file(version="IFC4")
    project = ifcopenshell.api.root.create_entity(f, ifc_class="IfcProject", name="SafeBridge 시연 현장")
    ifcopenshell.api.unit.assign_unit(f)  # 기본: 미터
    model = ifcopenshell.api.context.add_context(f, context_type="Model")
    body = ifcopenshell.api.context.add_context(
        f, context_type="Model", context_identifier="Body", target_view="MODEL_VIEW", parent=model
    )
    site = ifcopenshell.api.root.create_entity(f, ifc_class="IfcSite", name="가상 현장")
    building = ifcopenshell.api.root.create_entity(f, ifc_class="IfcBuilding", name="A동")
    ifcopenshell.api.aggregate.assign_object(f, relating_object=project, products=[site])
    ifcopenshell.api.aggregate.assign_object(f, relating_object=site, products=[building])

    nx = int(spec.width // spec.grid) + 1
    ny = int(spec.depth // spec.grid) + 1
    h = spec.floor_height
    for i in range(spec.floors):
        level = f"{i + 1}F"
        elev = i * h
        storey = ifcopenshell.api.root.create_entity(f, ifc_class="IfcBuildingStorey", name=level)
        storey.Elevation = elev
        ifcopenshell.api.aggregate.assign_object(f, relating_object=building, products=[storey])

        # 기둥: 층 바닥 ~ 상부 슬래브 하단
        col_h = h - spec.slab_thickness
        for gx in range(nx):
            for gy in range(ny):
                col = ifcopenshell.api.root.create_entity(f, ifc_class="IfcColumn", name=f"기둥 {level}")
                col.Tag = f"COL-{level}-{chr(65 + gy)}{gx + 1}"
                s = spec.column_size
                rep = ifcopenshell.api.geometry.add_wall_representation(
                    f, context=body, length=s, height=col_h, thickness=s
                )
                _place(f, rep, col, gx * spec.grid - s / 2, gy * spec.grid - s / 2, elev)
                ifcopenshell.api.spatial.assign_container(f, relating_structure=storey, products=[col])

        # 상부 슬래브: 층 상단(=다음 층 바닥). i층 작업 = i층 상부 슬래브 거푸집·타설
        slab = ifcopenshell.api.root.create_entity(f, ifc_class="IfcSlab", name=f"슬래브 {level} 상부")
        slab.Tag = f"SLB-{level}"
        rep = ifcopenshell.api.geometry.add_slab_representation(
            f, context=body, depth=spec.slab_thickness,
            polyline=[(0.0, 0.0), (spec.width, 0.0), (spec.width, spec.depth), (0.0, spec.depth)],
        )
        _place(f, rep, slab, 0.0, 0.0, elev + h - spec.slab_thickness)
        ifcopenshell.api.spatial.assign_container(f, relating_structure=storey, products=[slab])

        for name, ox, oy, ow, od in spec.openings:
            op = ifcopenshell.api.root.create_entity(f, ifc_class="IfcOpeningElement", name=f"{name} 개구부")
            op.Tag = f"OPN-{level}-{name}"
            rep = ifcopenshell.api.geometry.add_slab_representation(
                f, context=body, depth=spec.slab_thickness + 0.02,
                polyline=[(0.0, 0.0), (ow, 0.0), (ow, od), (0.0, od)],
            )
            _place(f, rep, op, ox, oy, elev + h - spec.slab_thickness - 0.01)
            ifcopenshell.api.feature.add_feature(f, feature=op, element=slab)
    return f


def write(path: Path, spec: BuildingSpec = BuildingSpec()) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    build(spec).write(str(path))
    return path
