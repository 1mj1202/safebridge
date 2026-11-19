"""Ollama 로컬 LLM 공급자 (시연용) — /api/chat 의 tools 기능을 쓴다.

기본 모델 qwen3:8b (다국어·도구 호출 지원). `ollama pull qwen3:8b` 후 SAFEBRIDGE_LLM_PROVIDER=ollama.
"""
from __future__ import annotations

import json
import re
import uuid

import httpx

from .base import Conversation, LLMError, LLMProvider, StepResult, ToolCall, ToolSpec


class OllamaConversation(Conversation):
    def __init__(self, provider: "OllamaProvider", system: str, tools: list[ToolSpec]):
        self.p = provider
        self.tools = [
            {"type": "function",
             "function": {"name": t.name, "description": t.description, "parameters": t.input_schema}}
            for t in tools
        ]
        self.messages: list[dict] = [{"role": "system", "content": system}]
        self._names: dict[str, str] = {}

    def add_user(self, text: str) -> None:
        self.messages.append({"role": "user", "content": text})

    def step(self) -> StepResult:
        body = {"model": self.p.model, "messages": self.messages, "stream": False, "think": False}
        if self.tools:
            body["tools"] = self.tools
        try:
            r = httpx.post(f"{self.p.url}/api/chat", json=body, timeout=self.p.timeout)
            r.raise_for_status()
        except httpx.HTTPError as e:
            raise LLMError(f"Ollama 호출 실패({self.p.url}, {self.p.model}): {e}") from e
        msg = r.json().get("message", {})
        self.messages.append(msg)
        calls = []
        for tc in msg.get("tool_calls") or []:
            fn = tc.get("function", {})
            args = fn.get("arguments") or {}
            if isinstance(args, str):
                try:
                    args = json.loads(args)
                except json.JSONDecodeError:
                    args = {}
            cid = tc.get("id") or uuid.uuid4().hex[:12]
            self._names[cid] = fn.get("name", "")
            calls.append(ToolCall(cid, fn.get("name", ""), args))
        # 생각(thinking) 태그를 내보내는 모델도 있어 본문에서 지운다
        text = re.sub(r"<think>.*?</think>", "", msg.get("content") or "", flags=re.S).strip()
        return StepResult(text=text, tool_calls=calls,
                          stop_reason="tool_use" if calls else "end_turn")

    def add_tool_results(self, results: list[tuple[str, str, bool]]) -> None:
        for cid, content, _err in results:
            self.messages.append({"role": "tool", "tool_name": self._names.get(cid, ""), "content": content})


class OllamaProvider(LLMProvider):
    name = "ollama"

    def __init__(self, url: str, model: str, timeout: float):
        self.url = url.rstrip("/")
        self.model = model
        self.timeout = timeout

    def conversation(self, system: str, tools: list[ToolSpec]) -> Conversation:
        return OllamaConversation(self, system, tools)
