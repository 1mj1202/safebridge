"""평가 항목 설명문에서 사례 ID·조문 ID를 인용한 문장(절)을 뺀다.

관련 사례·근거 조문은 화면에서 따로 접어 보여 주므로 설명문에 같은 내용이 겹치지 않게 한다.
예) "단부에서 추락 위험이 있으며 이는 LAW-42에 근거합니다. 사례 SIF-0479에서 유사한 사고가 발생했습니다."
 →  "단부에서 추락 위험이 있습니다."
"""
from __future__ import annotations

import copy
import re

REF = re.compile(r"\b(?:LAW|SIF|CSI)-\d+")
_SENT = re.compile(r"(?<=[.!?。])\s+")
# 이어지는 절 앞에서 끊을 때 연결 어미를 문장 끝으로 바꾼다 (있으며 → 있습니다)
_ENDINGS = (("으며", "습니다."), ("하며", "합니다."), ("이며", "입니다."), ("며", "니다."))


def _cut_clause(sentence: str) -> str:
    """ID가 나오기 전 마지막 절까지 남긴다. 남길 절이 없으면 빈 문자열."""
    head = sentence[:REF.search(sentence).start()]
    m = None
    for m in re.finditer(r"(며|고|,)\s", head):
        pass
    if not m:
        return ""
    kept = head[:m.start() + len(m.group(1))].rstrip(", ")
    for end, repl in _ENDINGS:
        if kept.endswith(end):
            return kept[: -len(end)] + repl
    return kept + "."


def strip_refs(text: str) -> str:
    if not text or not REF.search(text):
        return text
    out = []
    for s in _SENT.split(text.strip()):
        if not REF.search(s):
            out.append(s)
        else:
            cut = _cut_clause(s)
            if len(cut) > 4:
                out.append(cut)
    cleaned = " ".join(out).strip()
    return cleaned or text  # 전부 지워지면 원문 유지


def clean_draft(draft: dict) -> dict:
    """설명문을 정리한 사본 (저장된 원본은 건드리지 않는다)."""
    d = copy.deepcopy(draft)
    for it in d.get("items", []):
        if isinstance(it, dict) and it.get("explanation"):
            it["explanation"] = strip_refs(str(it["explanation"]))
    return d
