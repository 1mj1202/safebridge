"""Claude API 공급자 (Anthropic Python SDK, Messages API 수동 도구 루프).

- 모델 기본값 claude-opus-5-5, effort 는 SAFEBRIDGE_CLAUDE_EFFORT (기본 medium)
- 안전 분류기 거절(refusal) 시 서버 측 대체 모델로 재시도(fallbacks="default")
- 응답 content 는 그대로 대화에 붙인다(thinking 블록 보존)
"""
from __future__ import annotations


import anthropic

from .base import Conversation, LLMError, LLMProvider, StepResult, ToolCall, ToolSpec

FALLBACK_BETA = "server-side-fallback-2026-07-01"


class ClaudeConversation(Conversation):
    def __init__(self, provider: "ClaudeProvider", system: str, tools: list[ToolSpec]):
        self.p = provider
        self.system = system
        self.tools = [
            {"name": t.name, "description": t.description, "input_schema": t.input_schema} for t in tools
        ]
        self.messages: list[dict] = []

    def add_user(self, text: str) -> None:
        self.messages.append({"role": "user", "content": text})

    def step(self) -> StepResult:
        kwargs = dict(
            model=self.p.model,
            max_tokens=16000,
            system=self.system,
            messages=self.messages,
            output_config={"effort": self.p.effort},
            betas=[FALLBACK_BETA],
            fallbacks="default",
        )
        if self.tools:
            kwargs["tools"] = self.tools
        try:
            resp = self.p.client.beta.messages.create(**kwargs)
        except anthropic.RateLimitError as e:
            raise LLMError(f"Claude 사용량 한도: {e}") from e
        except anthropic.APIStatusError as e:
            raise LLMError(f"Claude API 오류 {e.status_code}: {e.message}") from e
        except anthropic.APIConnectionError as e:
            raise LLMError(f"Claude 연결 실패: {e}") from e

        if resp.stop_reason == "refusal":
            return StepResult(text="", stop_reason="refusal")
        self.messages.append({"role": "assistant", "content": resp.content})
        text = "".join(b.text for b in resp.content if b.type == "text")
        calls = [ToolCall(b.id, b.name, dict(b.input)) for b in resp.content if b.type == "tool_use"]
        return StepResult(text=text, tool_calls=calls, stop_reason=resp.stop_reason or "end_turn")

    def add_tool_results(self, results: list[tuple[str, str, bool]]) -> None:
        self.messages.append({
            "role": "user",
            "content": [
                {"type": "tool_result", "tool_use_id": cid, "content": content, "is_error": err}
                for cid, content, err in results
            ],
        })


class ClaudeProvider(LLMProvider):
    name = "claude"

    def __init__(self, model: str, effort: str, timeout: float):
        self.model = model
        self.effort = effort
        self.client = anthropic.Anthropic(timeout=timeout)

    def conversation(self, system: str, tools: list[ToolSpec]) -> Conversation:
        return ClaudeConversation(self, system, tools)
