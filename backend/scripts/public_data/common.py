"""공통: 원본 파일 찾기(맥 압축의 NFD 파일명 대응)·CSV 읽기·JSON 쓰기."""
from __future__ import annotations

import csv
import json
import unicodedata
from pathlib import Path


def find(src: Path, prefix: str) -> Path:
    """파일명 앞부분(예: '07_안전보건공단')으로 찾는다. 하위 폴더 포함."""
    want = unicodedata.normalize("NFC", prefix)
    for p in sorted(src.rglob("*.csv")):
        if "__MACOSX" in p.parts:
            continue
        if unicodedata.normalize("NFC", p.name).startswith(want):
            return p
    raise FileNotFoundError(f"{prefix}* 파일이 {src} 에 없습니다")


def read_csv(path: Path) -> list[dict]:
    raw = path.read_bytes()
    for enc in ("utf-8-sig", "cp949"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise ValueError(f"인코딩을 알 수 없음: {path}")
    return [{(k or "").strip(): (v or "").strip() for k, v in row.items()}
            for row in csv.DictReader(text.splitlines(keepends=True))]


def write_json(path: Path, obj, compact: bool = False) -> None:
    # 사례 파일은 커서 한 줄에 한 건씩(diff 가 사례 단위로 보이게)
    if compact and "cases" in obj:
        head = {k: v for k, v in obj.items() if k != "cases"}
        body = ",\n".join(json.dumps(c, ensure_ascii=False) for c in obj["cases"])
        text = json.dumps(head, ensure_ascii=False)[:-1] + ', "cases": [\n' + body + "\n]}"
    else:
        text = json.dumps(obj, ensure_ascii=False, indent=1)
    path.write_text(text + "\n", encoding="utf-8")


def grade(text: str) -> int | None:
    """'H(4)' → 4. 위험요소 프로파일의 등급 표기."""
    if "(" in text and text.endswith(")"):
        try:
            return int(text[text.index("(") + 1:-1])
        except ValueError:
            return None
    return None
