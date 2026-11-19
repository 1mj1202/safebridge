"""에이전트 루프 — mock 공급자 + 도구를 빠뜨리는 공급자."""
from datetime import date

from app.agent import runner
from app.llm.base import Conversation, LLMProvider, StepResult
from app.llm.mock import MockProvider


def test_mock_agent_builds_evidence_backed_draft():
    r = runner.run(MockProvider(), "내일 3층 작업 위험 알려줘", date(2026, 11, 23))
    d = r["draft"]
    assert d["date"] == "2026-11-24" and d["storey"] == "3F"
    keys = [i["key"] for i in d["items"]]
    assert keys[:2] == ["fall_edge", "fall_opening"] and "weather_wind_high" in keys
    edge = d["items"][0]
    assert edge["evidence"]["cases"] and "SLB-3F" in edge["evidence"]["elements"]
    assert set(edge["evidence"]["laws"]) == {"LAW-42", "LAW-13"}
    assert all(i["explanation"] for i in d["items"])
    assert not any(t["auto"] for t in r["trace"] if t["tool"] != "get_law")


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
    assert {t["tool"] for t in r["trace"] if t["auto"]} >= {"get_schedule", "compute_spatial_risk", "check_weather"}
    assert r["draft"]["items"] and r["draft"]["llm_note"]
