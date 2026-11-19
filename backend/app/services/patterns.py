"""재해 패턴 DB — 구조화된 사고사례 집계(공종 × 사고유형 × 원인 × 대책) + 유사사례 검색.

신뢰도 CONF_MIN 미만 사례는 집계에서 뺀다(PDF: 낮은 신뢰도 항목 제외).
표현은 '발생할 사고'가 아니라 '과거 사례에서 많았던 사고 유형'이다(데이터 편향 명시).
"""
from __future__ import annotations

import json
import math
from collections import Counter
from functools import lru_cache

from app.core.config import get_settings

CONF_MIN = 0.7


@lru_cache
def cases() -> tuple[dict, ...]:
    path = get_settings().data_dir / "accidents.json"
    return tuple(json.loads(path.read_text(encoding="utf-8"))["cases"])


def reload() -> None:
    cases.cache_clear()
    _index.cache_clear()


def get_case(case_id: str) -> dict | None:
    return next((c for c in cases() if c["case_id"] == case_id), None)


def pattern(trade: str) -> dict:
    rows = [c for c in cases() if c["trade"] == trade and c.get("confidence", 1) >= CONF_MIN]
    excluded = sum(1 for c in cases() if c["trade"] == trade and c.get("confidence", 1) < CONF_MIN)
    types = Counter(c["accident_type"] for c in rows)
    total = len(rows)
    return {
        "trade": trade,
        "total": total,
        "excluded_low_confidence": excluded,
        "virtual": any(c.get("virtual") for c in rows),
        "accident_types": [
            {"type": t, "count": n, "share": round(n / total, 2),
             "fatal": sum(1 for c in rows if c["accident_type"] == t and c["severity"] == "사망"),
             "top_objects": Counter(c["cause_object"] for c in rows if c["accident_type"] == t).most_common(3),
             "top_causes": Counter(x for c in rows if c["accident_type"] == t for x in c["causes"]).most_common(3),
             "top_measures": Counter(x for c in rows if c["accident_type"] == t for x in c["measures"]).most_common(3)}
            for t, n in types.most_common()
        ],
        "note": "과거 사례에서 많았던 사고 유형이며, 오늘 반드시 일어난다는 뜻은 아닙니다.",
    }


# ---- 유사사례 검색: 문자 2-gram TF-IDF 코사인 (외부 임베딩 없이 동작, 한국어에 무난) ----
def _grams(text: str) -> Counter:
    t = "".join(text.split())
    return Counter(t[i:i + 2] for i in range(len(t) - 1))


@lru_cache
def _index():
    docs = [_grams(f"{c['work']} {c['accident_type']} {c['cause_object']} {c['raw_text']}") for c in cases()]
    df = Counter(g for d in docs for g in d)
    n = len(docs)
    idf = {g: math.log((1 + n) / (1 + k)) + 1 for g, k in df.items()}
    vecs = []
    for d in docs:
        v = {g: tf * idf[g] for g, tf in d.items()}
        norm = math.sqrt(sum(x * x for x in v.values())) or 1
        vecs.append({g: x / norm for g, x in v.items()})
    return idf, vecs


def similar(query: str, k: int = 3, trade: str | None = None, accident_type: str | None = None,
            cause_object: str | None = None) -> list[dict]:
    idf, vecs = _index()
    q = {g: tf * idf.get(g, 0) for g, tf in _grams(query).items()}
    qn = math.sqrt(sum(x * x for x in q.values())) or 1
    scored = []
    for c, v in zip(cases(), vecs):
        if trade and c["trade"] != trade:
            continue
        if accident_type and c["accident_type"] != accident_type:
            continue
        if cause_object and c["cause_object"] != cause_object:
            continue
        s = sum(x * v.get(g, 0) for g, x in q.items()) / qn
        scored.append((s, c))
    scored.sort(key=lambda x: (-x[0], x[1]["case_id"]))
    return [{**c, "score": round(s, 3)} for s, c in scored[:k]]
