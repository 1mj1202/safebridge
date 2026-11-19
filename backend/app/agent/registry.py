"""에이전트 도구 목록 — 이름 → (명세, 실행 함수)."""
from collections.abc import Callable

from app.llm.base import ToolSpec

from .tools import law_tool, patterns_tool, schedule_tool, spatial_tool, weather_tool

TOOLS: dict[str, tuple[ToolSpec, Callable[[dict], dict]]] = {
    m.SPEC.name: (m.SPEC, m.run)
    for m in (schedule_tool, patterns_tool, spatial_tool, weather_tool, law_tool)
}


def specs() -> list[ToolSpec]:
    return [s for s, _ in TOOLS.values()]
