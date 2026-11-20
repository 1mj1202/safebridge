"""사고사례: 안전보건공단 SIF 건설업 사망사고(07) + 국토안전관리원 위험요소프로파일 사고사례(06)."""
from __future__ import annotations

import re
from pathlib import Path

from . import mapping as m
from .common import find, read_csv

SIF_SOURCE = "안전보건공단 사망사고 고위험요인(SIF) 아카이브 건설업 2016-2023"
CSI_SOURCE = "국토안전관리원 위험요소프로파일 사고사례"
_YEAR = re.compile(r"(\d{4})년\s*(\d{1,2})월")


def _date(text: str) -> str:
    mt = _YEAR.search(text)
    return f"{mt.group(1)}-{int(mt.group(2)):02d}" if mt else ""


def _measures(text: str) -> list[str]:
    parts = [p.strip(" -\n") for p in re.split(r"▶|\n", text)]
    return [p for p in parts if len(p) > 3][:4]


def sif(src: Path) -> list[dict]:
    out = []
    for r in read_csv(find(src, "07_안전보건공단")):
        if not r.get("재해개요"):
            continue
        obj_raw = r["기인물"]
        out.append({
            "case_id": f"SIF-{int(r['연번']):04d}",
            "source": SIF_SOURCE,
            "virtual": False,
            "date": _date(r["재해개요"]),
            "trade": m.sif_trade(r["단위작업명"], obj_raw) or "기타",
            "category": r["공종"].split(". ", 1)[-1],
            "work": r["단위작업명"].split(" ", 1)[-1],
            "accident_type": m.accident_type(r["재해종류"], m.cause_object(obj_raw)),
            "accident_type_raw": r["재해종류"],
            "cause_object": m.cause_object(obj_raw),
            "cause_object_raw": obj_raw,
            "causes": [r["재해유발요인"]] if r["재해유발요인"] else [],
            "measures": _measures(r["위험성감소대책(예시)"]),
            "severity": "사망",
            "confidence": 1.0,
            "raw_text": r["재해개요"],
        })
    return out


def csi(src: Path) -> list[dict]:
    out = []
    for i, r in enumerate(read_csv(find(src, "06_국토안전관리원")), 1):
        injury = r["인적피해"]
        obj = r["객체"]
        acc = "추락" if injury.startswith("떨어짐") else "낙하" if "맞음" in injury else \
            "붕괴" if "무너짐" in injury or "깔림" in injury else "협착" if "끼임" in injury else injury.split("(")[0]
        trade = m.sif_trade("", obj) or {"철근콘크리트공사": "거푸집"}.get(r["공종명"], "기타")
        out.append({
            "case_id": f"CSI-{r['구분']}-{i:02d}",
            "source": CSI_SOURCE,
            "virtual": False,
            "date": f"{r['구분'][:4]}-{r['구분'][4:]}" if len(r["구분"]) == 6 else "",
            "trade": trade,
            "category": r["공종명"],
            "work": r["작업프로세스"],
            "accident_type": acc,
            "accident_type_raw": injury,
            "cause_object": m.cause_object(obj),
            "cause_object_raw": obj,
            "causes": [r["원인"]],
            "measures": [],
            "severity": "사망" if "사망" in injury else "부상",
            "confidence": 1.0,
            "raw_text": f"{r['시설종류']} {r['공종명']} {r['위치']} {r['작업프로세스']} 중 {obj} 관련 {injury}. 원인: {r['원인']}",
        })
    return out


def build(src: Path) -> dict:
    cases = sif(src) + csi(src)
    return {"source": f"{SIF_SOURCE}; {CSI_SOURCE}",
            "_note": f"실제 공공데이터. 출처: {SIF_SOURCE}; {CSI_SOURCE}. "
                     "사망사고 위주 자료라 빈도는 '사망사고에서 많았던 유형'으로 읽는다.",
            "cases": cases}
