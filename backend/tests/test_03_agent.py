"""에이전트 루프 — mock 공급자 + 도구를 빠뜨리는 공급자."""
from datetime import date

from app.agent import runner
from app.llm.base import Conversation, LLMProvider, StepResult, ToolCall
from app.llm.mock import MockProvider


def test_mock_agent_builds_evidence_backed_draft():
    r = runner.run(MockProvider(), "내일 3층 작업 위험 알려줘", date(2026, 11, 23))
    d = r["draft"]
    assert d["date"] == "2026-11-24" and d["storey"] == "3F"
    keys = [i["key"] for i in d["items"]]
    assert "weather_wind_high" in keys
    ranks = [i["risk_rank"] for i in d["items"] if "risk_rank" in i]
    assert ranks == sorted(ranks) and ranks[0] == 1
    edge = next(i for i in d["items"] if i["key"] == "fall_edge")
    assert edge["rank_basis"]["p"] == 3 and edge["rank_basis"]["s"] == 4 and edge["rank_basis"]["w"] == 1.27
    assert edge["evidence"]["cases"] and "SLB-3F" in edge["evidence"]["elements"]
    assert set(edge["evidence"]["laws"]) == {"LAW-42", "LAW-13"}
    assert all(i["explanation"] for i in d["items"])
    # 대책 선택 목록: 후보는 기본 대책을 모두 담고 더 많을 수 있다
    assert edge["measures"] and set(edge["measures"]) <= set(edge["measure_options"])
    assert not any(t["auto"] for t in r["trace"] if t["tool"] != "get_regulation")
    assert {t["tool"] for t in r["trace"]} >= {"get_activities", "get_spatial_hazards", "query_hazard_rules",
                                               "search_cases", "get_guides", "get_regulation", "get_weather",
                                               "get_accident_stats"}
    zones = {b["zone"]: b for b in d["briefings"]}
    assert zones["A동 3F-a"]["teams"] and zones["A동 2F-a"]["restricted"]
    assert any(s["key"] == "falling_object" for s in zones["A동 2F-a"]["safety"])


class _Lazy(Conversation):
    """도구를 하나도 부르지 않고, JSON 도 엉망으로 쓰는 모델."""

    def add_user(self, text): pass
    def add_tool_results(self, results): pass
    def step(self): return StepResult(text="잘 모르겠습니다")


class LazyProvider(LLMProvider):
    name = "lazy"

    def conversation(self, system, tools): return _Lazy()


def test_runner_fills_missing_tools_and_default_text():
    r = runner.run(LazyProvider(), "위험 알려줘", date(2026, 11, 23), day="2026-11-24", storey="3F")
    assert {t["tool"] for t in r["trace"] if t["auto"]} >= {"get_activities", "get_spatial_hazards", "get_weather"}
    assert r["draft"]["items"] and r["draft"]["llm_note"]


class _WrongStorey(Conversation):
    """3F 를 부른 뒤 1F 를 다시 부르는 모델 (Ollama 에서 실제로 본 순서)."""

    def __init__(self): self.n = 0
    def add_user(self, text): pass
    def add_tool_results(self, results): pass

    def step(self):
        self.n += 1
        if self.n == 1:
            return StepResult(text="", tool_calls=[ToolCall("1", "get_activities", {"storey": "3F"})], stop_reason="tool_use")
        if self.n == 2:
            return StepResult(text="", tool_calls=[ToolCall("2", "get_activities", {"storey": "1F"})], stop_reason="tool_use")
        return StepResult(text="끝")


class WrongStoreyProvider(LLMProvider):
    name = "wrong"

    def conversation(self, system, tools): return _WrongStorey()


def test_runner_keeps_requested_storey():
    r = runner.run(WrongStoreyProvider(), "내일 3층 작업 위험 알려줘", date(2026, 11, 23))
    d = r["draft"]
    assert d["tasks"] and d["briefings"]
    assert all(t["input"].get("storey") == "3F" for t in r["trace"] if t["tool"] == "get_activities")
