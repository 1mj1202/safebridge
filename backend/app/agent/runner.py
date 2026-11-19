"""안전 에이전트 실행 — LLM 도구 호출 루프 → 초안 골격(코드) → 설명 작성(LLM).

로컬 모델이 도구를 빠뜨려도 결과가 비지 않도록, 필수 도구는 끝에 코드가 보완 호출한다(trace 에 auto 표시).
"""
from __future__ import annotations

import json
import logging
import re
from datetime import date

from app.llm.base import LLMError, LLMProvider

from . import draft, prompts
from .registry import TOOLS, specs

log = logging.getLogger(__name__)
MAX_STEPS = 8


def _resolve(query: str, day: str | None, storey: str | None, today: date) -> tuple[str, str | None]:
    if not day:
        m = re.search(r"\d{4}-\d{2}-\d{2}", query)
        if m:
            day = m.group(0)
        else:
            offset = 2 if "모레" in query else 1 if "내일" in query else 0
            day = date.fromordinal(today.toordinal() + offset).isoformat()
    if not storey:
        m = re.search(r"(\d+)\s*(?:층|F)", query)
        storey = f"{m.group(1)}F" if m else None
    return day, storey


def _json(text: str) -> dict | None:
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return None


def run(provider: LLMProvider, query: str, today: date, day: str | None = None,
        storey: str | None = None) -> dict:
    day, storey = _resolve(query, day, storey, today)
    trace: list[dict] = []
    results: dict = {"get_accident_patterns": {}}

    def execute(name: str, args: dict, auto: bool = False) -> tuple[str, bool]:
        if name not in TOOLS:
            trace.append({"tool": name, "input": args, "ok": False, "auto": auto})
            return json.dumps({"error": f"알 수 없는 도구 {name}"}, ensure_ascii=False), True
        # 날짜·층은 화면에서 고른 값을 우선한다(모델이 다른 날짜를 넣는 실수 방지)
        if "date" in TOOLS[name][0].input_schema["properties"]:
            args = {**args, "date": day}
        try:
            out = TOOLS[name][1](args)
        except Exception as e:  # 도구 오류는 모델에게 돌려준다
            log.exception("도구 실패 %s", name)
            trace.append({"tool": name, "input": args, "ok": False, "auto": auto, "error": str(e)})
            return json.dumps({"error": str(e)}, ensure_ascii=False), True
        if name == "get_accident_patterns":
            results[name][args["trade"]] = out
        else:
            results[name] = out
        trace.append({"tool": name, "input": args, "ok": True, "auto": auto})
        return json.dumps(out, ensure_ascii=False), False

    conv = provider.conversation(prompts.SYSTEM, specs())
    conv.add_user(f"기준일(오늘): {today.isoformat()}\n작업일: {day}\n구역: {storey or '전체'}\n요청: {query}")
    llm_error = None
    try:
        for _ in range(MAX_STEPS):
            res = conv.step()
            if res.stop_reason == "refusal":
                llm_error = "모델이 요청을 거절했습니다."
                break
            if not res.tool_calls:
                break
            conv.add_tool_results([(c.id, *execute(c.name, c.input)) for c in res.tool_calls])
    except LLMError as e:
        llm_error = str(e)
        log.warning("에이전트 LLM 오류: %s", e)

    # 필수 도구 보완
    if "get_schedule" not in results:
        execute("get_schedule", {"storey": storey} if storey else {}, auto=True)
    trades = sorted({t["trade"] for t in results["get_schedule"]["tasks"] if t["trade"] != "양생"})
    for tr in trades:
        if tr not in results["get_accident_patterns"]:
            execute("get_accident_patterns", {"trade": tr}, auto=True)
    if "compute_spatial_risk" not in results:
        execute("compute_spatial_risk", {"storey": storey} if storey else {}, auto=True)
    if "check_weather" not in results:
        execute("check_weather", {"trades": trades}, auto=True)
    skeleton = draft.build(day, storey, results)
    need_laws = sorted({i for it in skeleton["items"] for i in it["evidence"]["laws"]})
    have = {a["id"] for a in results.get("get_law", {}).get("articles", [])}
    if set(need_laws) - have:
        execute("get_law", {"ids": need_laws}, auto=True)
        skeleton = draft.build(day, storey, results)

    # 설명 작성
    written = None
    if llm_error is None:
        slim = {k: skeleton[k] for k in ("date", "storey", "tasks", "forecast")}
        slim["items"] = [
            {k: it[k] for k in ("id", "hazard", "location", "level", "measures")}
            | {"similar_cases": it["evidence"]["cases"], "elements": it["evidence"]["elements"][:3],
               "laws": it["evidence"]["laws"]}
            for it in skeleton["items"]
        ]
        try:
            conv.add_user(prompts.WRITE.format(skeleton=json.dumps(slim, ensure_ascii=False, indent=1)))
            res = conv.step()
            written = _json(res.text)
        except LLMError as e:
            llm_error = str(e)
    _merge(skeleton, written)
    skeleton["llm_note"] = llm_error or ("" if written else "설명 문장 생성 실패: 기본 문장으로 대체")
    return {"draft": skeleton, "trace": trace, "provider": provider.name}


def _merge(skeleton: dict, written: dict | None) -> None:
    by_id = {i.get("id"): i for i in (written or {}).get("items", []) if isinstance(i, dict)}
    for it in skeleton["items"]:
        w = by_id.get(it["id"], {})
        it["explanation"] = str(w.get("explanation") or f"{it['location']}: {it['hazard']} 위험.")
        ms = w.get("measures")
        if isinstance(ms, list) and ms:
            it["measures"] = [str(m) for m in ms][:4]
    skeleton["summary"] = str((written or {}).get("summary") or
                              f"{skeleton['date']} 주요 위험 {len(skeleton['items'])}건 (기본 문장).")
    notes = (written or {}).get("notes")
    skeleton["notes"] = [str(n) for n in notes][:4] if isinstance(notes, list) else []
