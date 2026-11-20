"""유의어사전(10)·KOSHA GUIDE 목록(09) → 검색어 확장용 유의어, 건설안전 지침 목록."""
from __future__ import annotations

from pathlib import Path

from .common import find, read_csv

SYN_SOURCE = "안전보건공단 산업현장 법률용어 유의어사전"
GUIDE_SOURCE = "안전보건공단 KOSHA GUIDE 목록"


def synonyms(src: Path) -> dict:
    groups = []
    for r in read_csv(find(src, "10_안전보건공단")):
        g = list(dict.fromkeys(v for k, v in r.items() if k.startswith("용어") and v))
        # 한 글자 용어는 문장 어디에나 걸려 검색을 흐리므로 뺀다
        g = [t for t in g if len(t) >= 2]
        if len(g) >= 2:
            groups.append(g)
    return {"_note": f"출처: {SYN_SOURCE}", "groups": groups}


def guides(src: Path) -> dict:
    out = []
    for r in read_csv(find(src, "09_안전보건공단")):
        if r["분류기호"] != "C":
            continue
        out.append({"id": r["지침번호"], "title": r["명칭"], "year": r["년도"]})
    return {"_note": f"출처: {GUIDE_SOURCE} (건설안전지침 C 분류)", "source": GUIDE_SOURCE, "guides": out}
