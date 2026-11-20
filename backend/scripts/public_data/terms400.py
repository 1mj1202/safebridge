"""안전보건공단 외국인 노동자 안전보건용어 400선 PDF → 언어별 용어·예문.

PyMuPDF 로 글자 크기·굵기를 읽어 역할을 나눈다(별도 설치: pip install pymupdf).
카드마다 외국어(용어 굵고 큼 · 뜻 굵게 · 예문 보통) 다음에 한국어(용어 · 뜻 · 예문)가 같은 열에 온다.
PDF 글꼴 문제로 생기는 중복 결합문자·대체문자·엉뚱한 라틴 글자는 clean() 에서 바로잡는다.
"""
from __future__ import annotations

import re
import unicodedata
from pathlib import Path

COUNTRY_LANG = {"네팔": "ne", "몽골": "mn", "라오스": "lo", "동티모르": "tet", "미얀마": "my"}
NON_LATIN = {"ne", "lo", "my", "mn"}
_HANGUL = re.compile(r"[가-힣]")


def clean(text: str, lang: str = "") -> str:
    text = re.sub(r"\s+", " ", text.replace("\ufffd", ""))
    if lang in NON_LATIN:
        # 글꼴 매핑이 깨져 끼어든 라틴 글자(예: ຫຼືF, သို့Ƌ) — 괄호 속 약어(KOSHA)는 남긴다
        text = re.sub(r"(?<=[^\x00-ɏ\s])[A-Za-zÀ-ɏ]+", "", text)
        text = re.sub(r"[\u00c0-\u024f`\\]", "", text)
    out: list[str] = []
    for ch in text:
        if out and ch == out[-1] and unicodedata.category(ch) in ("Mn", "Mc"):
            continue  # 같은 결합문자가 두 번 찍힌 것
        out.append(ch)
    s = "".join(out)
    # 결합문자 앞의 공백 제거, 공백을 사이에 둔 중복 결합문자 제거(미얀마어 ရေး း → ရေး)
    s = "".join(ch for i, ch in enumerate(s)
                if not (ch == " " and i + 1 < len(s) and unicodedata.category(s[i + 1]) in ("Mn", "Mc")))
    out = []
    for ch in s:
        if out and ch == out[-1] and unicodedata.category(ch) in ("Mn", "Mc"):
            continue
        out.append(ch)
    s = "".join(out).replace("()", "")
    s = re.sub("(र्)([क-ह])\\2", r"\1\2", s)  # 네팔어 reph 뒤 자음 중복(कार्यय → कार्य)
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"\s+([.।။?!])", r"\1", s)
    return s.strip()


def _lines(page) -> list[tuple[int, float, float, bool, str]]:
    """(열, y, 글자크기, 굵음, 글) — 같은 줄의 조각은 x 순서로 잇는다."""
    spans = []
    for b in page.get_text("dict")["blocks"]:
        for ln in b.get("lines", []):
            for s in ln["spans"]:
                if s["text"].strip() and s["size"] > 7:
                    spans.append((s["bbox"][0], s["bbox"][1], s["size"], "Bold" in s["font"], s["text"]))
    col_of = lambda x: 0 if x < 600 else 1  # noqa: E731 — 한 쪽에 두 열
    rows: dict[tuple[int, int, float, bool], list] = {}
    for x, y, size, bold, t in spans:
        key = (col_of(x), round(y / 3), round(size, 1), bold)
        rows.setdefault(key, []).append((x, t))
    return sorted((k[0], k[1] * 3, k[2], k[3], "".join(t for _x, t in sorted(v))) for k, v in rows.items())


def parse(pdf: Path, lang: str) -> list[dict]:
    import fitz  # PyMuPDF — 변환 때만 필요

    cards = []
    for page in fitz.open(pdf):
        cols: dict[int, list] = {}
        for col, y, size, bold, t in _lines(page):
            cols.setdefault(col, []).append((y, size, bold, t))
        for col in cols.values():
            col.sort()
            cur = {"f": {}, "k": {}}
            last_y: dict[tuple[bool, str], float] = {}
            for y, size, bold, t in col:
                ko = bool(_HANGUL.search(t))
                big = size >= (11.5 if ko else 12.5)
                role = "term" if big else "def" if bold else "example"
                side = cur["k" if ko else "f"]
                # 바로 아래 줄이면 줄바꿈된 같은 항목, 멀리 떨어졌으면 위쪽 것은 단원 제목이라 버린다
                near = y - last_y.get((ko, role), -1e9) < size * 1.8
                side[role] = (side.get(role, "") + " " + t).strip() if near else t
                last_y[(ko, role)] = y
                if ko and role == "example":
                    if cur["f"].get("term") and cur["k"].get("term"):
                        cards.append(cur)
                    cur = {"f": {}, "k": {}}
    cards = [c for c in cards if c["k"]["term"] not in ("차례",)]
    return [{"ko": clean(c["k"]["term"]), "ko_example": clean(c["k"].get("example", "")),
             "term": clean(c["f"]["term"], lang), "example": clean(c["f"].get("example", ""), lang)} for c in cards]


def build(src: Path) -> dict:
    langs: dict[str, dict] = {}
    for pdf in sorted(src.rglob("*.pdf")):
        name = unicodedata.normalize("NFC", pdf.stem)
        lang = next((v for k, v in COUNTRY_LANG.items() if k in name), None)
        if lang:
            langs[lang] = {c["ko"]: c for c in parse(pdf, lang)}
    terms = []
    for ko in sorted({k for v in langs.values() for k in v}):
        row: dict = {"ko": ko}
        for lang, d in sorted(langs.items()):
            if ko in d:
                row.setdefault("ko_example", d[ko]["ko_example"])
                row[lang] = {"term": d[ko]["term"], "example": d[ko]["example"]}
        terms.append(row)
    return {"_note": "출처: 안전보건공단 외국인 노동자 안전보건용어 400선. PDF 글자 추출 후 자동 보정, 원어민 검수 전.",
            "source": "안전보건공단 외국인 노동자 안전보건용어 400선", "langs": sorted(langs), "terms": terms}
