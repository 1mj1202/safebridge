"""python -m scripts.public_data --src <학습자료 폴더> [--out backend/data]"""
from __future__ import annotations

import argparse
from pathlib import Path

from . import cases, profile, stats, terms, terms400
from .common import write_json

OUT = Path(__file__).resolve().parents[2] / "data"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--src", type=Path, required=True)
    ap.add_argument("--out", type=Path, default=OUT)
    a = ap.parse_args()
    jobs = {
        "accidents.json": lambda: cases.build(a.src),
        "risk_profile.json": lambda: profile.build(a.src),
        "accident_stats.json": lambda: stats.build(a.src),
        "synonyms.json": lambda: terms.synonyms(a.src),
        "kosha_guides.json": lambda: terms.guides(a.src),
    }
    if any(a.src.rglob("*.pdf")):  # 용어 400선 PDF 가 있으면(PyMuPDF 필요)
        jobs["terms400.json"] = lambda: terms400.build(a.src)
    for name, job in jobs.items():
        obj = job()
        write_json(a.out / name, obj, compact=name == "accidents.json")
        size = len(obj.get("cases") or obj.get("rows") or obj.get("groups") or obj.get("guides") or obj.get("terms") or [1])
        print(f"{name}: {size}건")


if __name__ == "__main__":
    main()
