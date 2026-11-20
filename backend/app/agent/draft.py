"""위험성평가 초안 골격 — 도구 결과로 항목·근거·위험도를 코드가 정한다(결정론적).

LLM 은 이 골격의 설명 문장·시공 유의사항만 쓴다. 근거가 없는 항목은 evidence_status='확인 불가'.
위험도·순위: ranking.py (R = P × S × w + 기상, 상위 5). 프로파일이 없으면 사고사례 비중과 위험별 최소 강도로 상/중/하.
구역별 챗봇 브리핑 골격: briefing.py.
"""
from __future__ import annotations

from app.services import crosswalk, guides, patterns, risk_profile, stats

from . import briefing, ranking

# 위험 키 → (위험명, 사고유형, 기인물 필터, 영역 판별, 근로자 확인 문장 키, 추가 조문)
HAZARDS = {
    "fall_edge": ("슬래브 단부 추락", "추락", "슬래브 단부", lambda z: z["kind"] == "fall" and "-EDGE-" in z["id"],
                  ["check.harness", "check.guardrail", "check.helmet"], ["LAW-13"]),
    "fall_opening": ("개구부 추락", "추락", "개구부", lambda z: z["kind"] == "fall" and "-OPN-" in z["id"],
                     ["check.opening_cover", "check.harness"], []),
    "falling_object": ("상부 작업 낙하물", "낙하", None, lambda z: z["kind"] == "drop",
                       ["check.no_entry_below", "check.tool_tether", "check.helmet"], []),
    "collapse": ("거푸집·동바리 붕괴", "붕괴", None, None, ["check.shoring"], ["LAW-332", "LAW-334"]),
    "caught": ("인양물 협착·충돌", "협착", None, None, ["check.signal"], ["LAW-146"]),
}
TRADE_HAZARDS = {
    "거푸집": ["fall_edge", "fall_opening", "falling_object", "collapse"],
    "철근": ["fall_edge", "fall_opening", "falling_object"],
    "타설": ["fall_edge", "collapse"],
    "양중": ["falling_object", "caught"],
}


# 위험 고유 강도(최소값): 추락·붕괴는 중대재해로 이어지기 쉬워 3
BASE_SEVERITY = {"fall_edge": 3, "fall_opening": 3, "collapse": 3, "falling_object": 2, "caught": 2}


def _grade3(v: float, hi: float, mid: float) -> int:
    return 3 if v >= hi else 2 if v >= mid else 1


def _level(freq: float, profile: dict | None, base: int = 1) -> str:
    if profile:
        f = _grade3(profile["likelihood"], 3.0, 2.3)
        s = _grade3(profile["severity"], 3.7, 3.0)
    else:
        f, s = _grade3(freq, 0.4, 0.15), 1
    score = f * max(base, s)
    return "상" if score >= 6 else "중" if score >= 3 else "하"


def _dup(m: str, seen: list[str]) -> bool:
    """실제 사례의 대책 문장은 표현만 조금 다른 것이 많아 앞부분·포함 관계로 중복을 거른다."""
    return any(m in x or x in m or m[:12] == x[:12] for x in seen)


def _profile(trades: list[str], acc_types: list[str]) -> dict | None:
    """관련 공종 중 가장 위험한(가능성×심각성 최대) 프로파일."""
    rows = [r for tr in trades for t in acc_types if (r := risk_profile.get(tr, t))]
    return max(rows, key=lambda r: r["likelihood"] * r["severity"], default=None)


def build(day: str, storey: str | None, results: dict) -> dict:
    tasks = results.get("get_activities", {}).get("tasks", [])
    trades = sorted({t["trade"] for t in tasks if t["trade"] != "양생"})
    zones = results.get("get_spatial_hazards", {}).get("zones", [])
    pats = results.get("search_cases", {})  # trade → pattern
    wx = results.get("get_weather", {})
    laws = {a["id"]: a for a in results.get("get_regulation", {}).get("articles", [])}

    keys: list[str] = []
    for tr in trades:
        for k in TRADE_HAZARDS.get(tr, []):
            if k not in keys:
                keys.append(k)

    items = []
    for k in keys:
        name, acc_type, obj, zone_pred, checks, extra_laws = HAZARDS[k]
        rel_trades = [tr for tr in trades if k in TRADE_HAZARDS.get(tr, [])]
        hz_zones = [z for z in zones if zone_pred and zone_pred(z)]
        case_ids, measures, count, total = [], [], 0, 0
        for tr in rel_trades:
            p = pats.get(tr)
            if not p:
                continue
            total += p["total"]
            for t in p["accident_types"]:
                if t["type"] != acc_type and not (k == "caught" and t["type"] == "충돌"):
                    continue
                # 기인물이 정해진 위험(단부·개구부)은 그 기인물 사례 수만 센다
                n = dict(t["top_objects"]).get(obj, 0) if obj else t["count"]
                count += n
                for c in t.get("similar_cases", []):
                    if (obj is None or c["cause_object"] == obj) and c["case_id"] not in case_ids:
                        case_ids.append(c["case_id"])
                for m, _n in t["top_measures"]:
                    if not _dup(m, measures):
                        measures.append(m)
        if count == 0 and not hz_zones:
            continue  # 근거가 전혀 없으면 항목을 만들지 않는다
        rule_ids = list(dict.fromkeys([z["rule"] for z in hz_zones] + extra_laws))
        elements = list(dict.fromkeys(t for z in hz_zones for t in z["element_tags"]))
        locs = sorted({z["label"] for z in hz_zones})
        if k == "fall_edge" and hz_zones:
            sides = "·".join(z["id"].rsplit("-", 1)[-1].removesuffix("측") for z in hz_zones)
            locs = [f"{hz_zones[0]['storey']} 슬래브 외곽 단부({sides}측)"]
        prof = _profile(rel_trades, [acc_type] + (["충돌"] if k == "caught" else []))
        storeys = sorted({z["storey"] for z in hz_zones}) or sorted({t["storey"] for t in tasks})
        items.append({
            "id": f"H{len(items) + 1}",
            "key": k,
            "hazard": name,
            "trades": rel_trades,
            "location": ", ".join(locs[:3]) + (f" 외 {len(locs) - 3}곳" if len(locs) > 3 else "")
                        if locs else f"{'/'.join(storeys)} 작업 구간",
            "storeys": storeys,
            "level": _level(count / total if total else 0, prof, BASE_SEVERITY.get(k, 1)),
            "profile": {k2: prof[k2] for k2 in ("id", "n", "likelihood", "severity")} if prof else None,
            "frequency": {"count": count, "of": total},
            "measures": measures[:4],
            "checks": checks + (["check.signal"] if k == "falling_object" and "양중" in trades else []),
            "evidence": {
                "cases": case_ids[:3],
                "elements": elements[:6],
                "zones": [z["id"] for z in hz_zones],
                "laws": rule_ids,
                "guides": guides.for_hazard(k),
            },
            "evidence_status": "근거 있음" if (case_ids or hz_zones or prof) else "확인 불가",
            "explanation": "",
        })

    for a in wx.get("alerts", []):
        fact = stats.weather_fact(a["code"])
        items.append({
            "id": f"H{len(items) + 1}", "key": f"weather_{a['code']}", "hazard": a["text"],
            "trades": a.get("affects", trades), "affects": a.get("affects") or [], "location": "현장 전체", "storeys": [],
            "level": "상" if a["level"] == "stop" else "중" if a["level"] == "warn" else "하",
            "frequency": None, "measures": [], "checks": [],
            "weather": {"phrase": a["phrase"], "value": a["value"]},
            "stat": fact,
            "evidence": {"cases": [], "elements": [], "zones": [], "laws": [a["rule"]] if a.get("rule") else [],
                         "guides": [], "forecast": wx.get("forecast")},
            "evidence_status": "근거 있음", "explanation": "",
        })

    items = ranking.apply(items, wx.get("alerts", []))
    sched = results.get("get_activities", {})
    briefings = briefing.build(items, sched.get("zones", []), zones)

    return {
        "date": day,
        "storey": storey or "/".join(sorted({t["storey"] for t in tasks})),
        "tasks": [{"id": t["id"], "name": t["name"], "trade": t["trade"], "crew": t["crew"],
                   "work_key": crosswalk.work_key(t["trade"])} for t in tasks],
        "briefings": briefings,
        "items": items,
        "laws": [laws[i] for i in sorted({i for it in items for i in it["evidence"]["laws"]}) if i in laws],
        "forecast": wx.get("forecast"),
        "summary": "",
        "notes": [],
        "data_note": "사고사례는 가상 데이터(시연용)입니다." if any(p.get("virtual") for p in pats.values()) else "",
        "sources": {"cases": patterns.source(), "profile": risk_profile.source(), "hourly": stats.hourly_peak()},
    }
