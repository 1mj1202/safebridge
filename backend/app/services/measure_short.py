"""사례 대책 원문 → 개조식 짧은 문구 표 (data/measures_short.json).

현장 공종(거푸집·양중·타설·철근) 사례 대책을 미리 줄여 둔 표다. 분석 시간에는 영향이 없고,
저장·승인되는 대책은 원문 그대로이며 화면에만 짧은 문구를 보여 준다.
표에 없는 대책(직접 추가, 22자 이하 등)은 원문을 그대로 쓴다.
"""
from __future__ import annotations

import json
from functools import lru_cache

from app.core.config import get_settings


@lru_cache
def table() -> dict[str, str]:
    path = get_settings().data_dir / "measures_short.json"
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def short(text: str) -> str | None:
    return table().get(text.strip())


def short_map(item: dict) -> dict[str, str]:
    """항목에 나오는 대책(선택·후보·참고)의 원문 → 짧은 문구."""
    texts = list(item.get("measures") or []) + list(item.get("measure_options") or [])
    texts += [r.get("text", "") for r in item.get("reference_measures") or [] if isinstance(r, dict)]
    out = {}
    for t in texts:
        s = short(str(t))
        if s:
            out[str(t)] = s
    return out
