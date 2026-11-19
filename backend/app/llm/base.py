"""LLM 공급자 공통 인터페이스 — Claude API / Ollama(로컬) / Mock 을 같은 방식으로 쓴다.

에이전트 루프(app.agent.runner)는 이 인터페이스만 알고, 메시지 형식 변환은 공급자가 맡는다.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class ToolSpec:
    name: str
    description: str
    input_schema: dict


@dataclass
class ToolCall:
    id: str
    name: str
    input: dict


@dataclass
class StepResult:
    text: str
    tool_calls: list[ToolCall] = field(default_factory=list)
    stop_reason: str = "end_turn"   # end_turn | tool_use | max_tokens | refusal | error


class LLMError(RuntimeError):
    pass


class Conversation(ABC):
    """공급자별 대화 상태(도구 호출 포함)."""

    @abstractmethod
    def add_user(self, text: str) -> None: ...

    @abstractmethod
    def step(self) -> StepResult:
        """모델을 한 번 호출하고 결과(텍스트·도구 호출)를 대화에 붙인다."""

    @abstractmethod
    def add_tool_results(self, results: list[tuple[str, str, bool]]) -> None:
        """[(tool_call_id, 결과 JSON 문자열, is_error)] — 한 번에 모두 붙인다."""


class LLMProvider(ABC):
    name: str = "base"

    @abstractmethod
    def conversation(self, system: str, tools: list[ToolSpec]) -> Conversation: ...

    def complete(self, system: str, prompt: str) -> str:
        """도구 없는 단발 호출(번역·문장 다듬기)."""
        conv = self.conversation(system, [])
        conv.add_user(prompt)
        res = conv.step()
        if res.stop_reason in ("refusal", "error"):
            raise LLMError(res.text or res.stop_reason)
        return res.text
