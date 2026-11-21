"""사진 AI 확인 — 요청한 안전시설이 보이는지, 사람이 찍혔는지 (참고용, 최종 판단은 반장).

사진을 볼 수 있는 공급자(Claude)일 때만 한다. Ollama(qwen3)·mock 은 사진을 못 보므로 건너뛰고 반장 확인만 받는다.
"""
from __future__ import annotations

import json
import logging
import re

from app.llm.base import LLMError
from app.llm.factory import get_provider

from . import glossary

log = logging.getLogger(__name__)

SYSTEM = ("You check construction-site safety photos for a Korean site manager. Judge only safety facilities, "
          "never identify or describe people. Reply with JSON only.")


def check(jpeg: bytes, request_key: str) -> tuple[str, str]:
    """→ (ai_status: ok | check | skipped, 한국어 한 줄 메모)"""
    prov = get_provider()
    see = getattr(prov, "see", None)
    if see is None:
        return "skipped", ""
    want = glossary.phrase(request_key, "ko") if request_key else "안전시설"
    prompt = (f"요청한 사진: {want}\n"
              'Return JSON: {"visible": true if the requested safety facility is clearly visible and looks installed, '
              '"people": true if any person is visible, "note": "<Korean, one line, <=40 chars>"}')
    try:
        raw = see(SYSTEM, prompt, jpeg)
        m = re.search(r"\{.*\}", raw, flags=re.S)
        d = json.loads(m.group(0)) if m else {}
    except (LLMError, json.JSONDecodeError, Exception) as e:  # 확인 실패는 반장 확인으로 넘긴다
        log.warning("사진 AI 확인 실패: %s", e)
        return "skipped", ""
    note = str(d.get("note", ""))[:80]
    if d.get("people"):
        note = (note + " · 사람 보임").strip(" ·")
    return ("ok" if d.get("visible") and not d.get("people") else "check"), note
