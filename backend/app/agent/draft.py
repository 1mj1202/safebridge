"""위험성평가 초안 골격 — 도구 결과로 항목·근거·위험도를 코드가 정한다(결정론적).

LLM 은 이 골격의 설명 문장·시공 유의사항만 쓴다. 근거가 없는 항목은 evidence_status='확인 불가'.
위험도 = 빈도(패턴 내 비중) × 강도(사망 비율, 위험별 최소 강도) → 상/중/하 (시연용 단순 기준).
"""
from __future__ import annotations

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


def _level(freq: float, fatal_ratio: float, base: int = 1) -> str:
    f = 3 if freq >= 0.4 else 2 if freq >= 0.15 else 1
    s = max(base, 3 if fatal_ratio >= 0.4 else 2 if fatal_ratio >= 0.2 else 1)
    score = f * s
    return "상" if score >= 6 else "중" if score >= 3 else "하"


def build(day: str, storey: str | None, results: dict) -> dict:
    tasks = results.get("get_schedule", {}).get("tasks", [])
    trades = sorted({t["trade"] for t in tasks if t["trade"] != "양생"})
    zones = results.get("compute_spatial_risk", {}).get("zones", [])
    pats = results.get("get_accident_patterns", {})  # trade → pattern
    wx = results.get("check_weather", {})
    laws = {a["id"]: a for a in results.get("get_law", {}).get("articles", [])}

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
        case_ids, measures, count, fatal, total = [], [], 0, 0, 0
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
                fatal += round(t["fatal"] * n / t["count"]) if t["count"] else 0
                for c in t.get("similar_cases", []):
                    if (obj is None or c["cause_object"] == obj) and c["case_id"] not in case_ids:
                        case_ids.append(c["case_id"])
                for m, _n in t["top_measures"]:
                    if m not in measures:
                        measures.append(m)
        if count == 0 and not hz_zones:
            continue  # 근거가 전혀 없으면 항목을 만들지 않는다
        rule_ids = list(dict.fromkeys([z["rule"] for z in hz_zones] + extra_laws))
        elements = list(dict.fromkeys(t for z in hz_zones for t in z["element_tags"]))
        locs = sorted({z["label"] for z in hz_zones})
        if k == "fall_edge" and hz_zones:
            sides = "·".join(z["id"].rsplit("-", 1)[-1].removesuffix("측") for z in hz_zones)
            locs = [f"{hz_zones[0]['storey']} 슬래브 외곽 단부({sides}측)"]
        storeys = sorted({z["storey"] for z in hz_zones}) or sorted({t["storey"] for t in tasks})
        items.append({
            "id": f"H{len(items) + 1}",
            "key": k,
            "hazard": name,
            "trades": rel_trades,
            "location": ", ".join(locs[:3]) + (f" 외 {len(locs) - 3}곳" if len(locs) > 3 else "")
                        if locs else f"{'/'.join(storeys)} 작업 구간",
            "storeys": storeys,
            "level": _level(count / total if total else 0, fatal / count if count else 0, BASE_SEVERITY.get(k, 1)),
            "frequency": {"count": count, "of": total},
            "measures": measures[:4],
            "checks": checks + (["check.signal"] if k == "falling_object" and "양중" in trades else []),
            "evidence": {
                "cases": case_ids[:3],
                "elements": elements[:6],
                "zones": [z["id"] for z in hz_zones],
                "laws": rule_ids,
            },
            "evidence_status": "근거 있음" if (case_ids or hz_zones) else "확인 불가",
            "explanation": "",
        })

    for a in wx.get("alerts", []):
        items.append({
            "id": f"H{len(items) + 1}", "key": f"weather_{a['code']}", "hazard": a["text"],
            "trades": a.get("affects", trades), "location": "현장 전체", "storeys": [],
            "level": "상" if a["level"] == "stop" else "중" if a["level"] == "warn" else "하",
            "frequency": None, "measures": [], "checks": [],
            "weather": {"phrase": a["phrase"], "value": a["value"]},
            "evidence": {"cases": [], "elements": [], "zones": [], "laws": [a["rule"]] if a.get("rule") else [],
                         "forecast": wx.get("forecast")},
            "evidence_status": "근거 있음", "explanation": "",
        })

    return {
        "date": day,
        "storey": storey or "/".join(sorted({t["storey"] for t in tasks})),
        "tasks": [{"id": t["id"], "name": t["name"], "trade": t["trade"], "crew": t["crew"]} for t in tasks],
        "items": items,
        "laws": [laws[i] for i in sorted({i for it in items for i in it["evidence"]["laws"]}) if i in laws],
        "forecast": wx.get("forecast"),
        "summary": "",
        "notes": [],
        "data_note": "사고사례는 가상 데이터(시연용)입니다." if any(p.get("virtual") for p in pats.values()) else "",
    }
