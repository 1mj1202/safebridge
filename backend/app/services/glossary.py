"""안전용어 고정 번역 사전 + 문장 은행 + 용어 유지 검사."""
from __future__ import annotations

from .data_store import load_json

LANGS = ("ko", "en", "zh", "vi", "th")


def terms() -> list[dict]:
    return load_json("glossary.json")["terms"]


def lang_names() -> dict:
    return load_json("phrases.json")["lang_names"]


def phrase(key: str, lang: str, **kw) -> str:
    p = load_json("phrases.json")["phrases"][key]
    text = p.get(lang) or p["ko"]
    return text.format(**kw) if kw else text


def terms_in(ko_text: str) -> list[dict]:
    """한국어 문장에 들어 있는 사전 용어(긴 용어 우선, 겹치면 짧은 쪽 제외)."""
    found = []
    for t in sorted(terms(), key=lambda t: -len(t["ko"])):
        if t["ko"] in ko_text and not any(t["ko"] in f["ko"] for f in found):
            found.append(t)
    return found


def check_terms(ko_text: str, translated: str, lang: str) -> dict:
    """번역문에 사전 고정 번역어가 그대로 쓰였는지."""
    if lang == "ko":
        return {"terms": [], "kept": 0, "total": 0, "rate": 1.0}
    rows = []
    low = translated.lower()
    for t in terms_in(ko_text):
        rows.append({"ko": t["ko"], "expected": t[lang], "kept": t[lang].lower() in low})
    kept = sum(r["kept"] for r in rows)
    return {"terms": rows, "kept": kept, "total": len(rows), "rate": round(kept / len(rows), 2) if rows else 1.0}


def glossary_hint(ko_text: str, lang: str) -> str:
    return "\n".join(f"- {t['ko']} → {t[lang]}" for t in terms_in(ko_text))
