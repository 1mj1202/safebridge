"""현장 구역·팀 배정 — 'A동 3F-a' 구역, 공종별 협력업체 팀(개인 정보 없음)."""
from __future__ import annotations

from app.services.data_store import load_json


def info() -> dict:
    return load_json("site.json")


def team_for(trade: str) -> dict | None:
    return next((t for t in info()["teams"] if t["trade"] == trade), None)


def zone_names(storey: str) -> list[str]:
    s = info()
    return [f"{s['building']} {storey}-{n}" for n in s["zone_split"]["names"]]


def zones_for_box(storey: str, bmin, bmax) -> list[str]:
    """위험 영역 상자가 걸치는 구역(분할선 기준)."""
    s = info()
    split = s["zone_split"]
    i = 0 if split["axis"] == "x" else 1
    names = zone_names(storey)
    out = []
    if bmin[i] < split["at"]:
        out.append(names[0])
    if bmax[i] > split["at"]:
        out.append(names[1])
    return out


def assignments(tasks: list[dict]) -> list[dict]:
    """그날 작업 → 구역별 팀 배정. 한 작업은 그 층 전 구역을 맡는다(골조는 층 단위로 진행)."""
    by_zone: dict[str, dict] = {}
    for t in tasks:
        if t["trade"] == "양생":
            continue
        team = team_for(t["trade"])
        for z in zone_names(t["storey"]):
            row = by_zone.setdefault(z, {"zone": z, "storey": t["storey"], "teams": [], "tasks": [], "langs": []})
            row["tasks"].append(t["id"])
            if team and team["team"] not in [x["team"] for x in row["teams"]]:
                row["teams"].append({k: team[k] for k in ("team", "company", "lead", "trade")})
                row["langs"] += [lg for lg in team["langs"] if lg not in row["langs"]]
    return sorted(by_zone.values(), key=lambda r: r["zone"])


def zones_of_hazard(z: dict) -> list[str]:
    """위험 영역 → 근로자 구역. 하부 낙하 영역은 아래층 구역, 외곽 지상은 '외곽 지상'."""
    if "-GROUND-" in z["id"]:
        return [f"{info()['building']} 외곽 지상"]
    storey = z["storey"]
    if z["id"].endswith("-BELOW") or z["id"].endswith("-SHAFT"):
        n = int(storey.rstrip("F")) - 1
        if n < 1:
            return []
        storey = f"{n}F"
    return zones_for_box(storey, z["min"], z["max"])


def zone_box(zone: str) -> dict | None:
    """근로자 구역의 3D 상자(IFC 좌표, m) — 그 층 슬래브 윗면부터 윗층 슬래브 아랫면까지, 분할선으로 반쪽."""
    from .bim import get_model

    s = info()
    m = get_model()
    slabs = sorted((e for e in m.elements if e.ifc_class == "IfcSlab"), key=lambda e: e.bbox_min[2])
    if not slabs:
        return None
    if zone == f"{s['building']} 외곽 지상":
        lo = [min(e.bbox_min[i] for e in slabs) - 2.0 for i in (0, 1)]
        hi = [max(e.bbox_max[i] for e in slabs) + 2.0 for i in (0, 1)]
        return {"min": [*lo, 0.0], "max": [*hi, 0.3]}
    storey = next((w for w in zone.split() if w[:1].isdigit()), "").split("-")[0]
    names = zone_names(storey)
    if zone not in names:
        return None
    slab = next((e for e in slabs if e.storey == storey), None)
    if slab is None:
        return None
    above = next((e for e in slabs if e.bbox_min[2] > slab.bbox_max[2]), None)
    top = above.bbox_min[2] if above else slab.bbox_max[2] + 3.0
    lo, hi = list(slab.bbox_min), list(slab.bbox_max)
    i = 0 if s["zone_split"]["axis"] == "x" else 1
    if names.index(zone) == 0:
        hi[i] = s["zone_split"]["at"]
    else:
        lo[i] = s["zone_split"]["at"]
    return {"min": [lo[0], lo[1], slab.bbox_max[2]], "max": [hi[0], hi[1], top]}
