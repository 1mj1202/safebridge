"""위험요소 프로파일(05, 국토안전관리원 설계안전성검토) → 공종×사고유형별 사고가능성·심각성 평균."""
from __future__ import annotations

from collections import defaultdict
from pathlib import Path

from . import mapping as m
from .common import find, grade, read_csv

SOURCE = "국토안전관리원 설계안전성검토 위험요소 프로파일"


def build(src: Path) -> dict:
    acc: dict[tuple[str, str], dict] = defaultdict(lambda: {"n": 0, "lik": 0, "sev": 0, "causes": defaultdict(int)})
    for r in read_csv(find(src, "05_국토안전관리원")):
        if r["공종분류(중)"] not in ("철근콘크리트공사", "가설공사"):
            continue
        obj = r["위험발생객체분류(중)"]
        trade = m.PROFILE_OBJECT_TRADE.get(obj)
        typ = m.profile_type(r["인적피해"], obj)
        lik, sev = grade(r["사고가능성"]), grade(r["사고심각성"])
        if not (trade and typ and lik and sev):
            continue
        a = acc[(trade, typ)]
        a["n"] += 1
        a["lik"] += lik
        a["sev"] += sev
        a["causes"][r["사고원인"]] += 1
    rows = {}
    for (trade, typ), a in sorted(acc.items()):
        rows[f"{trade}|{typ}"] = {
            "id": f"RP-{trade}-{typ}", "trade": trade, "accident_type": typ, "n": a["n"],
            "likelihood": round(a["lik"] / a["n"], 2), "severity": round(a["sev"] / a["n"], 2),
            "top_causes": sorted(a["causes"], key=lambda c: -a["causes"][c])[:3],
        }
    return {"_note": f"출처: {SOURCE}. 등급 1~5 평균(철근콘크리트·가설공사).", "source": SOURCE, "rows": rows}
