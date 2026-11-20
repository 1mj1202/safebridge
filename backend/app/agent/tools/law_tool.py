"""도구: 근거 조문 조회."""
from app.llm.base import ToolSpec
from app.services import law

SPEC = ToolSpec(
    name="get_regulation",
    description="근거 조문 ID(예: LAW-42) 목록으로 산업안전보건기준에 관한 규칙 조문 요약을 조회한다.",
    input_schema={
        "type": "object",
        "properties": {"ids": {"type": "array", "items": {"type": "string"}}},
        "required": ["ids"],
    },
)


def run(args: dict) -> dict:
    found = law.find(args.get("ids") or [])
    missing = [i for i in args.get("ids") or [] if i not in {a["id"] for a in found}]
    return {"articles": found, "not_found": missing}
