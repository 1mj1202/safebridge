"""TBM 카드 조립 — 승인된 위험성평가 → 언어별 카드 3장(일할 곳·조심할 사고·확인할 것).

카드 문장은 문장 은행(고정 번역)으로 조립한다. 관리자 한마디(자유 문장)만 LLM 번역 + 역번역.
"""
from __future__ import annotations

from . import glossary, weather_text

PICTO = {"fall_edge": "fall", "fall_opening": "opening", "falling_object": "drop", "collapse": "collapse",
         "caught": "caught", "weather_wind_high": "wind", "weather_wind_crane_stop": "wind",
         "weather_rain": "rain", "weather_cold": "cold"}
LEVEL_ORDER = {"상": 0, "중": 1, "하": 2}
MAX_HAZARDS = 3


def _top_items(draft: dict) -> list[dict]:
    items = [i for i in draft["items"] if i.get("included", True)]
    return sorted(items, key=lambda i: (LEVEL_ORDER.get(i["level"], 3), i["id"]))


def build_cards(draft: dict, lang: str, weather_tr: dict | None = None) -> list[dict]:
    items = _top_items(draft)
    storeys = sorted({s for i in items for s in i.get("storeys", [])}) or [draft.get("storey", "")]
    storey = storeys[0] if storeys else ""
    trades = list(dict.fromkeys(t["trade"] for t in draft["tasks"] if t["trade"] != "양생"))
    zone_ids = [z for i in items for z in i["evidence"]["zones"]]

    place_lines = [glossary.phrase("place.slab_top", lang, storey=storey)]
    place_lines += [glossary.phrase(f"work.{t}", lang) for t in trades]
    if any(i["key"] == "falling_object" for i in items):
        place_lines.append(glossary.phrase("place.below", lang, storey=storey))

    hazard_lines, check_keys = [], []
    for i in [i for i in items if not i["key"].startswith("weather_")][:MAX_HAZARDS]:
        hazard_lines.append({"text": glossary.phrase(f"hazard.{i['key']}", lang), "pictogram": PICTO.get(i["key"]),
                             "level": i["level"], "item_id": i["id"]})
        check_keys += [c for c in i.get("checks", []) if c not in check_keys]
    for i in [i for i in items if i["key"].startswith("weather_")]:
        hazard_lines.append({"text": weather_text.line(i, lang, (weather_tr or {}).get(i["id"])),
                             "pictogram": PICTO.get(i["key"]), "level": i["level"], "item_id": i["id"]})

    return [
        {"type": "place", "title": glossary.phrase("card.place", lang), "lines": place_lines,
         "storey": storey, "zone_ids": zone_ids},
        {"type": "hazard", "title": glossary.phrase("card.hazard", lang), "lines": hazard_lines},
        {"type": "check", "title": glossary.phrase("card.check", lang),
         "lines": [glossary.phrase(k, lang) for k in check_keys[:5]]},
    ]


def refresh_weather(cards: dict, draft: dict, weather_tr: dict | None = None) -> dict:
    """저장된 카드의 기상 경고 줄을 지금 규칙(승인 문구와 같은 뜻)으로 다시 쓴 사본 — 예전에 발행한 TBM 용."""
    import copy

    items = {i["id"]: i for i in draft.get("items", []) if i["key"].startswith("weather_")}
    out = copy.deepcopy(cards)
    for lang, cs in out.items():
        for line in (cs[1]["lines"] if len(cs) > 1 else []):
            it = items.get(line.get("item_id")) if isinstance(line, dict) else None
            if it:
                line["text"] = weather_text.line(it, lang, (weather_tr or {}).get(it["id"]))
    return out


def phrase_term_check(cards_ko: list[dict], cards: list[dict], lang: str) -> dict:
    """문장 은행 번역의 용어 유지율(정적 검사)."""
    def texts(cs):
        out = []
        for c in cs:
            for line in c["lines"]:
                out.append(line["text"] if isinstance(line, dict) else line)
        return out

    rows = [glossary.check_terms(k, t, lang) for k, t in zip(texts(cards_ko), texts(cards))]
    kept, total = sum(r["kept"] for r in rows), sum(r["total"] for r in rows)
    missed = [t for r in rows for t in r["terms"] if not t["kept"]]
    return {"kept": kept, "total": total, "rate": round(kept / total, 2) if total else 1.0, "missed": missed}


def floor_plan(draft: dict, zone_ids: list[str]) -> dict | None:
    """근로자 카드용 평면도(2D): 작업 층 슬래브 외곽 + 개구부 + 위험 영역(평면 투영)."""
    from .bim import get_model
    from .risk import zones_on

    storeys = sorted({s for i in draft["items"] for s in i.get("storeys", [])})
    if not storeys:
        return None
    m = get_model()
    slab = m.by_tag(f"SLB-{storeys[0]}")
    if slab is None:
        return None
    want = set(zone_ids)
    zs = [z for z in zones_on(draft["date"]) if z["id"] in want and "-GROUND-" not in z["id"]
          and not z["id"].endswith("-BELOW")]
    return {
        "storey": storeys[0],
        "bounds": [slab.bbox_min[0], slab.bbox_min[1], slab.bbox_max[0], slab.bbox_max[1]],
        "openings": [[o.bbox_min[0], o.bbox_min[1], o.bbox_max[0], o.bbox_max[1]]
                     for o in m.elements if o.ifc_class == "IfcOpeningElement" and o.storey == storeys[0]],
        "zones": [{"kind": z["kind"], "rect": [z["min"][0], z["min"][1], z["max"][0], z["max"][1]]} for z in zs],
    }
