"""도구: 진행 활동 조회 — 날짜(·층) → 진행 작업·표준 공종키·구역별 팀 배정."""
from app.llm.base import ToolSpec
from app.services import crosswalk, schedule, site

SPEC = ToolSpec(
    name="get_activities",
    description="4D 공정표에서 특정 날짜(YYYY-MM-DD)에 진행 중인 작업(표준 공종키 포함)과 구역별 팀 배정을 조회한다. "
                "층(예: 3F)을 주면 그 층만.",
    input_schema={
        "type": "object",
        "properties": {
            "date": {"type": "string", "description": "작업일 YYYY-MM-DD"},
            "storey": {"type": "string", "description": "층 이름, 예: 3F (선택)"},
        },
        "required": ["date"],
    },
)


def run(args: dict) -> dict:
    tasks = [{**t, "work_key": crosswalk.work_key(t["trade"])}
             for t in schedule.tasks_on(args["date"], args.get("storey") or None)]
    return {"date": args["date"], "storey": args.get("storey"), "tasks": tasks,
            "zones": site.assignments(tasks)}
