"""에이전트 도구 목록 — 이름 → (명세, 실행 함수)."""
from collections.abc import Callable

from app.llm.base import ToolSpec

from .tools import (guides_tool, hazard_rules_tool, law_tool, patterns_tool, schedule_tool, spatial_tool, stats_tool,
                    weather_tool)

MODULES = (schedule_tool, spatial_tool, hazard_rules_tool, patterns_tool, guides_tool, law_tool, weather_tool, stats_tool)

TOOLS: dict[str, tuple[ToolSpec, Callable[[dict], dict]]] = {
    m.SPEC.name: (m.SPEC, m.run)
    for m in MODULES
}


# 모델에게 보낼 때 줄이는 함수(없으면 그대로). 초안 계산에는 원래 결과를 쓴다.
BRIEF: dict[str, Callable[[dict], dict]] = {
    m.SPEC.name: m.brief
    for m in MODULES if hasattr(m, "brief")
}


def specs() -> list[ToolSpec]:
    return [s for s, _ in TOOLS.values()]
