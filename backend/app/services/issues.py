"""현장 이슈 처리 — 모국어 원문 → 한국어 번역·한 줄 요약·긴급도 → 전달 대상 → 회신 번역 (초안 v5 3번).

LLM 이 JSON 으로 번역·요약·분류를 한 번에 한다. 실패하거나 오프라인이면 번역은 비워 두고
긴급도는 키워드로 판정한다(긴급을 놓치지 않는 쪽으로).
"""
from __future__ import annotations

import json
import logging
import re

from app.llm.base import LLMError
from app.llm.factory import get_provider

from . import site, translate
from .translate import NAMES

log = logging.getLogger(__name__)

# 원문·번역 어디에든 있으면 긴급(위험이 지금 눈앞에 있는 상황)
URGENT_WORDS = ("붕괴", "무너", "쓰러", "추락", "떨어지", "균열", "갈라", "흔들", "기울", "화재", "불이", "연기",
                "감전", "가스", "다쳤", "부상", "피가", "끊어", "collapse", "falling", "crack", "fire", "smoke",
                "shock", "gas", "injur", "hurt", "bleed", "broken")
SAFETY_WORDS = URGENT_WORDS + ("난간", "안전대", "덮개", "개구부", "안전모", "동바리", "위험", "미끄", "강풍",
                               "guardrail", "harness", "cover", "opening", "helmet", "danger", "slip")

SYSTEM = ("You triage messages from foreign construction workers for a Korean site manager. "
          "Reply with JSON only, no other text.")


def _keywords(*texts: str) -> tuple[bool, bool]:
    low = " ".join(texts).lower()
    urgent = any(w in low for w in URGENT_WORDS)
    return urgent, urgent or any(w in low for w in SAFETY_WORDS)


def _parse(raw: str) -> dict | None:
    m = re.search(r"\{.*\}", raw, flags=re.S)
    if not m:
        return None
    try:
        d = json.loads(m.group(0))
    except json.JSONDecodeError:
        return None
    return d if isinstance(d, dict) and d.get("ko") else None


def triage(text: str, lang: str) -> dict:
    """{text_ko, summary_ko, urgency, safety, translated}"""
    out = {"text_ko": text if lang == "ko" else "", "summary_ko": "", "translated": lang == "ko"}
    if get_provider().name != "mock":
        prompt = (f"Worker message ({NAMES[lang]}):\n{text}\n\n"
                  'Return JSON: {"ko": "<faithful Korean translation>", "summary": "<Korean, one line, <=40 chars>", '
                  '"urgency": "urgent" if someone may be hurt right now or a structure may fail/fall, else "normal", '
                  '"safety": true if it is about a safety hazard}')
        try:
            d = _parse(get_provider().complete(SYSTEM, prompt))
        except LLMError as e:
            log.warning("이슈 분류 실패: %s", e)
            d = None
        if d:
            out.update(text_ko=str(d["ko"]).strip(), summary_ko=str(d.get("summary") or "").strip(),
                       translated=True)
            urgent_kw, safety_kw = _keywords(text, out["text_ko"])
            # 모델이 '보통'이라 해도 키워드가 걸리면 긴급으로 올린다(놓치지 않는 쪽)
            out["urgency"] = "urgent" if d.get("urgency") == "urgent" or urgent_kw else "normal"
            out["safety"] = bool(d.get("safety")) or safety_kw or out["urgency"] == "urgent"
            return out
    urgent_kw, safety_kw = _keywords(text, out["text_ko"])
    out.update(urgency="urgent" if urgent_kw else "normal", safety=safety_kw)
    if not out["summary_ko"]:
        out["summary_ko"] = (out["text_ko"] or f"[{lang} 원문] {text}")[:40]
    return out


def route(brief_row: dict | None, urgency: str, safety: bool) -> list[str]:
    """구역 반장 → 원청 공사담당 → (안전·긴급이면) 안전관리자. 사람이 아니라 직책 단위."""
    c = site.info()["contacts"]
    leads = [t["lead"] for t in (brief_row or {}).get("teams", [])]
    return leads + [c["construction"]] + ([c["safety"]] if safety or urgency == "urgent" else [])


def answer(text_ko: str, lang: str) -> dict:
    """관리자 한국어 회신 → 근로자 언어."""
    r = translate.translate(text_ko, "ko", lang)
    return {"text": r["text"], "ok": r["ok"]}
