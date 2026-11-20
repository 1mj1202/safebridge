"""구역별 챗봇 브리핑 골격 — 구역(A동 3F-a)마다 팀·언어·날씨·시공·안전 항목 (초안 v5 별첨 2-6·2-7).

현장 챗봇은 관리자가 승인한 이 브리핑과 근거 안에서만 설명한다. 문장은 LLM 이 다듬을 수 있고, 항목·순위는 코드가 정한다.
"""
from __future__ import annotations

# 시공 주의: 위험 항목별로 현장에서 먼저 지킬 작업 순서(팀 작성)
BUILD_NOTE = {
    "collapse": "동바리·버팀대 설치를 끝낸 뒤 다음 작업",
    "caught": "인양 중에는 인양물 아래·사이에 들어가지 않기",
    "fall_opening": "개구부 덮개를 고정·표시한 뒤 자재 운반",
    "fall_edge": "단부 안전난간 확인 후 작업 시작",
    "falling_object": "상부 작업 중 하부 출입 통제",
}


def _build_keys(z_items: list[dict]) -> list[str]:
    return list(dict.fromkeys(i["key"] for i in z_items if i["key"] in BUILD_NOTE))[:2]


def build(items: list[dict], assignments: list[dict], hazard_zones: list[dict]) -> list[dict]:
    zone_site = {z["id"]: z.get("site_zones", []) for z in hazard_zones}
    rows: dict[str, dict] = {a["zone"]: {**a, "items": []} for a in assignments}
    for it in items:
        if it["key"].startswith("weather_"):
            continue
        sites = {s for zid in it["evidence"]["zones"] for s in zone_site.get(zid, [])}
        if not sites:  # 영역이 없는 위험(붕괴·협착)은 그 공종이 일하는 구역 전체
            sites = {a["zone"] for a in assignments if {t["trade"] for t in a["teams"]} & set(it["trades"])}
        for s in sorted(sites):
            storey = next((w for w in s.split() if w[:1].isdigit()), "").split("-")[0]
            row = rows.setdefault(s, {"zone": s, "storey": storey, "teams": [], "tasks": [], "langs": ["ko"], "items": []})
            row["items"].append(it)
    weather_items = [i for i in items if i["key"].startswith("weather_")]
    out = []
    for z in sorted(rows.values(), key=lambda r: (not r["teams"], r["zone"])):
        z_items = sorted(z["items"], key=lambda i: i.get("risk_rank", 99))
        trades = {t["trade"] for t in z["teams"]}
        # 작업 팀이 없는 통제 구역에는 공종과 무관한 기상(한파 등)만
        weather = [{"item_id": w["id"], "text": w["hazard"], "level": w["level"]} for w in weather_items
                   if (set(w.get("affects") or trades) & trades if z["teams"] else not w.get("affects"))]
        out.append({
            "zone": z["zone"],
            "storey": z["storey"],
            "teams": z["teams"],
            "langs": z["langs"],
            "restricted": not z["teams"],  # 작업 팀이 없는데 위험이 걸린 구역 → 출입 통제 안내
            "weather": weather,
            "build": [BUILD_NOTE[k] for k in _build_keys(z_items)],
            "build_keys": _build_keys(z_items),  # 근로자 화면은 문장 은행 build.<key> 로 번역
            "safety": [{"item_id": i["id"], "key": i["key"], "hazard": i["hazard"], "level": i["level"],
                        "rank": i.get("risk_rank")} for i in z_items[:3]],
            "items": [i["id"] for i in z_items],
        })
    return out
