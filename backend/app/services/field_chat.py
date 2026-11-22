"""근로자 현장 챗봇 답변 — 승인된 구역 브리핑 안에서만, 근로자 언어로 짧게.

근거에 없는 질문·LLM 오류·오프라인(mock)이면 '반장에게 직접 확인하세요'(문장 은행)로 답한다.
"""
from __future__ import annotations

import logging

from app.llm.base import LLMError
from app.llm.factory import get_provider

from . import glossary
from . import translate
from .translate import NAMES

log = logging.getLogger(__name__)
NO_ANSWER = "NO_ANSWER"

_BASE = ("You are SafeBridge, a construction-site safety assistant talking to a site worker. "
         "Answer ONLY using the approved safety briefing given to you. Never invent rules, numbers or permissions. "
         "If the briefing covers the question only in part, say just what the briefing says and add that "
         "the worker should ask their team leader for the rest. "
         f"Only if nothing in the briefing relates to the question, reply exactly {NO_ANSWER}. ")


def system_prompt(lang: str) -> str:
    """언어 규칙은 근로자 언어별로 — 한국어 근로자에게 'never in Korean' 을 주면 늘 NO_ANSWER 로 빠졌다."""
    if lang == "ko":
        rule = "Use at most 3 short, plain sentences in Korean. No markdown."
    else:
        rule = ("Use at most 3 short, plain sentences in the worker's language, never in Korean "
                "(the briefing is Korean only for reference). No markdown.")
    return _BASE + rule


def answer(question: str, lang: str, context_ko: str) -> dict:
    fallback = {"text": glossary.phrase("chat.ask_lead", lang), "grounded": False}
    if not context_ko or get_provider().name == "mock":
        return fallback
    hint = glossary.glossary_hint(context_ko, lang) if lang != "ko" else ""
    prompt = (f"Approved briefing (Korean):\n{context_ko}\n\n"
              + (f"Use these fixed safety terms in {NAMES[lang]} exactly:\n{hint}\n\n" if hint else "")
              + f"Worker's question:\n{question}\n\nAnswer in {NAMES[lang]}.")
    try:
        text = get_provider().complete(system_prompt(lang), prompt).strip()
    except LLMError as e:
        log.warning("챗봇 답변 실패: %s", e)
        return fallback
    if not text or NO_ANSWER in text:
        return fallback
    if lang != "ko" and translate.looks_korean(text):
        # 근거가 한국어라 모델이 한국어로 답하는 경우가 있어 근로자 언어로 다시 옮긴다
        tr = translate.translate(text, "ko", lang)
        if not tr["ok"] or translate.looks_korean(tr["text"]):
            return fallback
        text = tr["text"]
    return {"text": text, "grounded": True}
