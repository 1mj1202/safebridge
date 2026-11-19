"""사고사례 CSV → LLM 구조화 → data/accidents.json (재해 패턴 DB).

입력 CSV(UTF-8) 열 — 국토안전관리원 건설안전사고 사례 내려받기 형식에 맞춰 이름만 바꾸면 된다:
  사고번호, 발생일, 공종, 사고경위, 사고원인, 재발방지대책, 인명피해
열 이름이 다르면 --map 사고경위=경위내용 처럼 지정한다.

    SAFEBRIDGE_LLM_PROVIDER=claude python -m scripts.structure_accidents uploads/cases.csv
    python -m scripts.structure_accidents uploads/cases.csv --limit 20 --out data/accidents.json

모델이 낸 JSON 은 pydantic 으로 검사하고, 형식이 틀리거나 값이 허용 목록 밖이면 confidence 를 낮춘다
(패턴 집계는 confidence 0.7 미만을 뺀다).
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from pathlib import Path

from pydantic import BaseModel, Field, ValidationError

from app.llm.base import LLMError
from app.llm.factory import get_provider

TRADES = ["거푸집", "철근", "타설", "양중", "가설", "토공", "철골", "마감", "기타"]
TYPES = ["추락", "낙하", "붕괴", "협착", "충돌", "전도", "감전", "기타"]
COLS = ["사고번호", "발생일", "공종", "사고경위", "사고원인", "재발방지대책", "인명피해"]

SYSTEM = "당신은 건설 사고 보고서를 구조화하는 분석가입니다. 주어진 글에 있는 사실만 뽑고 JSON 하나만 출력합니다."
PROMPT = """다음 건설사고 사례를 JSON 으로 구조화하세요.
필드: trade({trades} 중 하나), work(세부 작업, 짧게), accident_type({types} 중 하나),
cause_object(기인물, 짧게. 예: 슬래브 단부, 개구부, 거푸집 자재, 동바리, 인양 자재),
causes(원인 1~3개), measures(대책 1~3개), confidence(0~1, 글에서 확실히 알 수 있는 정도)

공종(원자료): {trade}
사고경위: {story}
사고원인: {cause}
재발방지대책: {measure}"""


class Extracted(BaseModel):
    trade: str
    work: str
    accident_type: str
    cause_object: str
    causes: list[str] = Field(min_length=1, max_length=5)
    measures: list[str] = Field(default_factory=list, max_length=5)
    confidence: float = Field(ge=0, le=1)


def extract(row: dict) -> dict:
    prompt = PROMPT.format(trades="·".join(TRADES), types="·".join(TYPES), trade=row.get("공종", ""),
                           story=row.get("사고경위", ""), cause=row.get("사고원인", ""),
                           measure=row.get("재발방지대책", ""))
    try:
        text = get_provider().complete(SYSTEM, prompt)
        m = re.search(r"\{.*\}", text, re.S)
        e = Extracted.model_validate_json(m.group(0) if m else "{}")
    except (LLMError, ValidationError) as err:
        return {"error": str(err)[:200], "confidence": 0.0}
    out = e.model_dump()
    if out["trade"] not in TRADES or out["accident_type"] not in TYPES:
        out["confidence"] = min(out["confidence"], 0.5)
    return out


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("csv", type=Path)
    ap.add_argument("--out", type=Path, default=Path(__file__).resolve().parents[1] / "data" / "accidents.json")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--map", nargs="*", default=[], help="표준열=원본열")
    a = ap.parse_args(argv)
    if get_provider().name == "mock":
        sys.exit("SAFEBRIDGE_LLM_PROVIDER 를 claude 또는 ollama 로 지정하세요")
    mapping = dict(m.split("=", 1) for m in a.map)
    with a.csv.open(encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    if a.limit:
        rows = rows[: a.limit]
    cases = []
    for i, raw in enumerate(rows, 1):
        row = {c: raw.get(mapping.get(c, c), "") for c in COLS}
        ex = extract(row)
        cases.append({
            "case_id": row["사고번호"] or f"C-{i:04d}", "virtual": False, "date": row["발생일"],
            "severity": "사망" if "사망" in row["인명피해"] else "부상",
            "raw_text": f"{row['사고경위']} 원인: {row['사고원인']}".strip(),
            **{k: ex.get(k, "" if k not in ("causes", "measures") else []) for k in
               ("trade", "work", "accident_type", "cause_object", "causes", "measures")},
            "confidence": ex.get("confidence", 0.0), **({"error": ex["error"]} if "error" in ex else {}),
        })
        print(f"[{i}/{len(rows)}] {cases[-1]['case_id']} {cases[-1]['trade']}/{cases[-1]['accident_type']} "
              f"conf={cases[-1]['confidence']}", flush=True)
    a.out.write_text(json.dumps({"_note": f"{a.csv.name} 에서 구조화", "cases": cases}, ensure_ascii=False,
                                indent=1), encoding="utf-8")
    print(f"저장: {a.out} ({len(cases)}건, 신뢰도 0.7 미만 {sum(c['confidence'] < 0.7 for c in cases)}건)")


if __name__ == "__main__":
    main()
