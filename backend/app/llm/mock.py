"""Mock 공급자 — API 키·로컬 모델 없이 개발·테스트·오프라인 시연용.

에이전트 대화에서는 사용자 문장에서 날짜·층을 읽어 도구를 정해진 순서로 호출하고,
마지막에는 도구 결과로 정해진 형식의 JSON 을 쓴다. 번역은 할 수 없으므로 원문을 돌려준다.
"""
from __future__ import annotations

import json
import re

from .base import Conversation, LLMProvider, StepResult, ToolCall, ToolSpec


class MockConversation(Conversation):
    def __init__(self, system: str, tools: list[ToolSpec]):
        self.tool_names = {t.name for t in tools}
        self.users: list[str] = []
        self.results: list[dict] = []
        self.calls: list[ToolCall] = []
        self.n = 0

    def add_user(self, text: str) -> None:
        self.users.append(text)

    def add_tool_results(self, results: list[tuple[str, str, bool]]) -> None:
        names = {c.id: c.name for c in self.calls}
        for cid, content, err in results:
            try:
                data = json.loads(content)
            except json.JSONDecodeError:
                data = {}
            self.results.append({"name": names.get(cid), "data": data, "error": err})

    def _call(self, name: str, args: dict) -> ToolCall:
        self.n += 1
        c = ToolCall(f"mock-{self.n}", name, args)
        self.calls.append(c)
        return c

    def step(self) -> StepResult:
        last = self.users[-1] if self.users else ""
        if "JSON" in last and "items" in last:
            return StepResult(text=self._write(last))
        if not self.tool_names:
            return StepResult(text=last.split("\n")[-1])  # 번역 불가: 원문 반환
        called = {r["name"] for r in self.results}
        ctx = " ".join(self.users)
        day = (re.search(r"\d{4}-\d{2}-\d{2}", ctx) or [None])[0]
        storey = re.search(r"(\d+)\s*(?:층|F)", ctx)
        storey = f"{storey.group(1)}F" if storey else None
        if "get_activities" not in called:
            args = {"date": day} | ({"storey": storey} if storey else {})
            return StepResult("", [self._call("get_activities", args)], "tool_use")
        if "search_cases" not in called:
            sched = next(r["data"] for r in self.results if r["name"] == "get_activities")
            trades = sorted({t["trade"] for t in sched.get("tasks", []) if t["trade"] != "양생"})
            calls = [self._call("search_cases", {"trade": t}) for t in trades]
            calls.append(self._call("get_spatial_hazards", {"date": day} | ({"storey": storey} if storey else {})))
            calls.append(self._call("get_weather", {"date": day, "trades": trades}))
            keys = sorted({t["work_key"] for t in sched.get("tasks", []) if t.get("work_key")})
            calls += [self._call("query_hazard_rules", {"work_key": k}) for k in keys]
            calls += [self._call("get_accident_stats", {"work_key": k}) for k in keys]
            calls.append(self._call("get_guides", {"hazards": ["fall_edge", "fall_opening", "falling_object",
                                                               "collapse", "caught"]}))
            return StepResult("", calls, "tool_use")
        if "get_regulation" not in called:
            ids = sorted({z["rule"] for r in self.results if r["name"] == "get_spatial_hazards"
                          for z in r["data"].get("zones", [])}
                         | {a["rule"] for r in self.results if r["name"] == "get_weather"
                            for a in r["data"].get("alerts", []) if a.get("rule")})
            return StepResult("", [self._call("get_regulation", {"ids": ids})], "tool_use")
        return StepResult(text="도구 결과를 모두 확인했습니다.")

    @staticmethod
    def _write(prompt: str) -> str:
        m = re.search(r"```json\n(.*?)\n```", prompt, re.S)
        skeleton = json.loads(m.group(1)) if m else {"items": []}
        items = []
        for it in skeleton.get("items", []):
            items.append({
                "id": it["id"],
                "explanation": f"{it['location']}에서 {it['hazard']} 위험이 있습니다.",
                "measures": it.get("measures", [])[:3],
            })
        return json.dumps({
            "summary": f"{skeleton.get('date', '')} {skeleton.get('storey', '')} 작업의 주요 위험 "
                       f"{len(items)}건을 정리했습니다. (오프라인 모드: 문장은 템플릿으로 작성)",
            "items": items,
            "notes": ["작업 전 단부·개구부 방호 상태를 직접 확인하세요.", "기상 기준을 넘으면 작업을 멈추고 다시 판단하세요."],
        }, ensure_ascii=False)


class MockProvider(LLMProvider):
    name = "mock"

    def conversation(self, system: str, tools: list[ToolSpec]) -> Conversation:
        return MockConversation(system, tools)
