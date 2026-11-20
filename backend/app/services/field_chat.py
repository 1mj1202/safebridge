"""근로자 현장 챗봇 답변 — 승인된 구역 브리핑 안에서만, 근로자 언어로 짧게.

근거에 없는 질문·LLM 오류·오프라인(mock)이면 '반장에게 직접 확인하세요'(문장 은행)로 답한다.
"""
from __future__ import annotations

import logging

from app.llm.base import LLMError
from app.llm.factory import get_provider

from . import glossary
from .translate import NAMES

log = logging.getLogger(__name__)
NO_ANSWER = "NO_ANSWER"

SYSTEM = ("You are SafeBridge, a construction-site safety assistant talking to a foreign worker. "
          "Answer ONLY using the approved safety briefing given to you. Never invent rules, numbers or permissions. "
          f"If the briefing does not answer the question, reply exactly {NO_ANSWER}. "
          "Use at most 3 short, plain sentences in the worker's language. No markdown.")


def answer(question: str, lang: str, context_ko: str) -> dict:
    fallback = {"text": glossary.phrase("chat.ask_lead", lang), "grounded": False}
    if not context_ko or get_provider().name == "mock":
        return fallback
    hint = glossary.glossary_hint(context_ko, lang) if lang != "ko" else ""
    prompt = (f"Approved briefing (Korean):\n{context_ko}\n\n"
              + (f"Use these fixed safety terms in {NAMES[lang]} exactly:\n{hint}\n\n" if hint else "")
              + f"Worker's question:\n{question}\n\nAnswer in {NAMES[lang]}.")
    try:
        text = get_provider().complete(SYSTEM, prompt).strip()
    except LLMError as e:
        log.warning("챗봇 답변 실패: %s", e)
        return fallback
    if not text or NO_ANSWER in text:
        return fallback
    return {"text": text, "grounded": True}
