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
