"""도구: 공정 조회 — 날짜(·층) → 진행 작업과 관련 부재."""
from app.llm.base import ToolSpec
from app.services import schedule

SPEC = ToolSpec(
    name="get_schedule",
    description="4D 공정표에서 특정 날짜(YYYY-MM-DD)에 진행 중인 작업 목록을 조회한다. 층(예: 3F)을 주면 그 층만.",
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
    tasks = schedule.tasks_on(args["date"], args.get("storey") or None)
    return {"date": args["date"], "storey": args.get("storey"), "tasks": tasks}
