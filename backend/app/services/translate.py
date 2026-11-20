"""다국어 변환 — 쉬운 문장 → 사전 고정 번역 → 역번역 확인. 근로자 신고는 모국어 → 한국어.

LLM 을 쓸 수 없으면(mock·오류) 원문을 돌려주고 ok=False 로 표시한다.
"""
from __future__ import annotations

import logging

from app.llm.base import LLMError
from app.llm.factory import get_provider

from . import glossary

log = logging.getLogger(__name__)
NAMES = {"ko": "Korean", "en": "English", "zh": "Simplified Chinese", "vi": "Vietnamese", "th": "Thai",
         "ne": "Nepali", "mn": "Mongolian (Cyrillic)", "lo": "Lao", "tet": "Tetum (Timor-Leste)", "my": "Burmese (Myanmar)"}

SYSTEM = ("You are a construction-site safety translator. Translate exactly, in short plain sentences a worker "
          "with little schooling understands. Output only the translation, nothing else.")


def looks_korean(text: str) -> bool:
    """한글이 글자의 30% 이상이면 한국어 답으로 본다(구역 이름 'A동' 같은 고유명은 허용)."""
    letters = [c for c in text if c.isalpha()]
    hangul = sum(1 for c in letters if "\uac00" <= c <= "\ud7a3")
    return bool(letters) and hangul / len(letters) >= 0.3


def _llm(prompt: str) -> str:
    return get_provider().complete(SYSTEM, prompt).strip()


def translate(text: str, src: str, tgt: str) -> dict:
    if src == tgt or not text.strip():
        return {"text": text, "ok": True}
    if get_provider().name == "mock":
        return {"text": text, "ok": False, "note": "오프라인 모드: 번역하지 않음"}
    hint = glossary.glossary_hint(text, tgt) if src == "ko" else ""
    prompt = (f"Translate from {NAMES[src]} to {NAMES[tgt]}.\n"
              + (f"Use these fixed safety terms exactly:\n{hint}\n" if hint else "")
              + f"Text:\n{text}")
    try:
        return {"text": _llm(prompt), "ok": True}
    except LLMError as e:
        log.warning("번역 실패: %s", e)
        return {"text": text, "ok": False, "note": str(e)}


def with_back_translation(ko_text: str, lang: str) -> dict:
    """한국어 → lang 번역 + 역번역 + 용어 유지 검사 (관리자 발행 화면에 표시)."""
    fwd = translate(ko_text, "ko", lang)
    back = translate(fwd["text"], lang, "ko") if fwd["ok"] else {"text": "", "ok": False}
    return {
        "source": ko_text, "translated": fwd["text"], "back": back["text"], "ok": fwd["ok"] and back["ok"],
        "terms": glossary.check_terms(ko_text, fwd["text"], lang) if fwd["ok"] else None,
        "note": fwd.get("note", ""),
    }
