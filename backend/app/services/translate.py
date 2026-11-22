"""다국어 변환 — 쉬운 문장 → 사전 고정 번역 → 역번역 확인. 근로자 신고는 모국어 → 한국어.

LLM 을 쓸 수 없으면(mock·오류) 원문을 돌려주고 ok=False 로 표시한다.
"""
from __future__ import annotations

import logging
import re
import unicodedata

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


def translate(text: str, src: str, tgt: str, ko_terms: list[str] | None = None) -> dict:
    """ko_terms: 역번역(→ko)일 때, 원문에 있던 현장 용어. 같은 뜻이면 그 한국어 용어로 쓰게 한다
    (예: '가장자리' 대신 '단부', '안전벨트' 대신 '안전대'). 뜻이 다르면 쓰지 말라고 해서 검사는 그대로 의미가 있다."""
    if src == tgt or not text.strip():
        return {"text": text, "ok": True}
    if get_provider().name == "mock":
        return {"text": text, "ok": False, "note": "오프라인 모드: 번역하지 않음"}
    hint = glossary.glossary_hint(text, tgt) if src == "ko" else ""
    ko_hint = ""
    if tgt == "ko" and ko_terms:
        ko_hint = "Korean site terms to prefer where they fit: " + ", ".join(ko_terms) + "\n"
    prompt = (f"Translate from {NAMES[src]} to {NAMES[tgt]}.\n"
              + (f"Use these fixed safety terms exactly:\n{hint}\n" if hint else "")
              + ko_hint
              + f"Text:\n{text}")
    try:
        return {"text": _llm(prompt), "ok": True}
    except LLMError as e:
        log.warning("번역 실패: %s", e)
        return {"text": text, "ok": False, "note": str(e)}


# 안전 지시의 뜻을 바꾸는 말: 적용 작업·장소·보호구·최종 지시. 원문에 있으면 역번역에도 있어야 한다.
KEY_WORDS = ("양중", "단부", "개구부", "타워크레인", "크레인", "타설", "거푸집", "동바리", "비계", "작업중지", "중지", "검토",
             "출입금지", "출입", "대피", "안전대", "안전모", "안전난간", "신호수", "덮개")


def _ascii_digits(text: str) -> str:
    return "".join(str(unicodedata.decimal(c)) if c.isdecimal() else c for c in text)


def key_words(src_ko: str) -> list[str]:
    """원문에 있는 작업·지시 말 + 사전 용어 ('작업중지'가 있으면 '중지'는 따로 안 본다)."""
    words = [w for w in KEY_WORDS if w in src_ko]
    words += [t["ko"] for t in glossary.terms_in(src_ko) if t["ko"] not in words]
    return [w for w in words if not any(w != o and w in o for o in words)]


def meaning_check(src_ko: str, translated: str, back_ko: str) -> dict:
    """번역이 뜻을 지켰는지: 원문의 수치(조건)는 번역문에, 작업·지시 말은 역번역(한국어)에 남아 있어야 한다."""
    nums = re.findall(r"\d+(?:\.\d+)?", src_ko)
    words = key_words(src_ko)
    translated = _ascii_digits(translated)  # 네팔어 १०, 태국어 ๑๐ 처럼 그 나라 숫자로 써도 같은 수로 본다
    missing = [n for n in nums if n not in translated] + [w for w in words if w not in back_ko]
    return {"ok": not missing, "missing": missing}


def with_back_translation(ko_text: str, lang: str) -> dict:
    """한국어 → lang 번역 + 역번역 + 용어 유지 + 뜻 검사 (관리자 발행 화면에 표시).

    뜻 검사(적용 작업·조건·지시)를 통과하지 못하면 ok=False → 근로자에게는 한국어 원문이 나간다.
    """
    fwd = translate(ko_text, "ko", lang)
    back = translate(fwd["text"], lang, "ko", ko_terms=key_words(ko_text)) if fwd["ok"] else {"text": "", "ok": False}
    meaning = meaning_check(ko_text, fwd["text"], back["text"]) if fwd["ok"] and back["ok"] else None
    note = fwd.get("note", "")
    if meaning and not meaning["ok"]:
        note = "뜻이 바뀜: " + ", ".join(meaning["missing"])
    return {
        "source": ko_text, "translated": fwd["text"], "back": back["text"],
        "ok": bool(fwd["ok"] and back["ok"] and meaning and meaning["ok"]),
        "terms": glossary.check_terms(ko_text, fwd["text"], lang) if fwd["ok"] else None,
        "meaning": meaning, "note": note,
    }


def still_ok(check: dict | None) -> bool:
    """예전에 발행된 번역 기록도 지금 뜻 검사로 다시 본다 (뜻 검사 전에 발행한 TBM)."""
    if not check or not check.get("ok"):
        return False
    if check.get("meaning") is None:
        return meaning_check(check.get("source", ""), check.get("translated", ""), check.get("back", ""))["ok"]
    return bool(check["meaning"]["ok"])
