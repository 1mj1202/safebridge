"""구조화 정확도 평가 — 팀 수작업 라벨과 비교 (PDF 검증 계획: 100건, 공종·사고유형·기인물).

라벨 CSV 열: case_id, trade, accident_type, cause_object

    python -m scripts.eval_structuring data/labels.csv [--pred data/accidents.json]
"""
from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

FIELDS = ("trade", "accident_type", "cause_object")


def evaluate(labels: list[dict], preds: dict[str, dict]) -> dict:
    res = {f: {"correct": 0, "total": 0} for f in FIELDS}
    for lab in labels:
        p = preds.get(lab["case_id"])
        if not p:
            continue
        for f in FIELDS:
            res[f]["total"] += 1
            res[f]["correct"] += int(str(p.get(f, "")).strip() == lab[f].strip())
    return {f: {**v, "accuracy": round(v["correct"] / v["total"], 3) if v["total"] else None}
            for f, v in res.items()}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("labels", type=Path)
    ap.add_argument("--pred", type=Path, default=Path(__file__).resolve().parents[1] / "data" / "accidents.json")
    a = ap.parse_args()
    with a.labels.open(encoding="utf-8-sig") as f:
        labels = list(csv.DictReader(f))
    preds = {c["case_id"]: c for c in json.loads(a.pred.read_text(encoding="utf-8"))["cases"]}
    print(json.dumps(evaluate(labels, preds), ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
