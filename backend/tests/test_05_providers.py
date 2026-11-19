"""공급자 메시지 형식 변환 (네트워크 없이)."""
import json
from types import SimpleNamespace

import httpx

from app.llm import ollama
from app.llm.base import ToolSpec
from app.llm.claude import ClaudeConversation

SPEC = ToolSpec("get_schedule", "d", {"type": "object", "properties": {"date": {"type": "string"}}})


class _FakeMessages:
    def __init__(self):
        self.calls = []

    def create(self, **kw):
        self.calls.append(kw)
        return SimpleNamespace(stop_reason="tool_use", content=[
            SimpleNamespace(type="thinking", thinking=""),
            SimpleNamespace(type="text", text="확인합니다"),
            SimpleNamespace(type="tool_use", id="tu1", name="get_schedule", input={"date": "2026-11-24"}),
        ])


def test_claude_conversation_keeps_content_and_sends_fallbacks():
    fake = _FakeMessages()
    provider = SimpleNamespace(model="claude-opus-5-5", effort="medium",
                               client=SimpleNamespace(beta=SimpleNamespace(messages=fake)))
    conv = ClaudeConversation(provider, "sys", [SPEC])
    conv.add_user("hi")
    res = conv.step()
    assert res.tool_calls[0].input == {"date": "2026-11-24"} and res.text == "확인합니다"
    kw = fake.calls[0]
    assert kw["fallbacks"] == "default" and kw["tools"][0]["name"] == "get_schedule"
    assert "tool_choice" not in kw and "thinking" not in kw
    assert conv.messages[1]["content"][0].type == "thinking"  # thinking 블록 그대로 보존
    conv.add_tool_results([("tu1", "{}", False)])
    assert conv.messages[-1]["content"][0] == {"type": "tool_result", "tool_use_id": "tu1", "content": "{}",
                                               "is_error": False}


def test_ollama_conversation_parses_tool_calls(monkeypatch):
    sent = {}

    def fake_post(url, json=None, timeout=None):
        sent.update(json)
        body = {"message": {"role": "assistant", "content": "",
                            "tool_calls": [{"function": {"name": "get_schedule",
                                                         "arguments": {"date": "2026-11-24"}}}]}}
        return httpx.Response(200, json=body, request=httpx.Request("POST", url))

    monkeypatch.setattr(ollama.httpx, "post", fake_post)
    conv = ollama.OllamaProvider("http://x", "qwen3:8b", 5).conversation("sys", [SPEC])
    conv.add_user("hi")
    res = conv.step()
    assert res.stop_reason == "tool_use" and res.tool_calls[0].name == "get_schedule"
    assert sent["tools"][0]["function"]["name"] == "get_schedule"
    conv.add_tool_results([(res.tool_calls[0].id, json.dumps({"ok": 1}), False)])
    assert conv.messages[-1] == {"role": "tool", "tool_name": "get_schedule", "content": '{"ok": 1}'}
