"""도구: KOSHA GUIDE 조회 — 위험 유형 → 관련 건설안전지침 번호·명칭."""
from app.llm.base import ToolSpec
from app.services import guides

SPEC = ToolSpec(
    name="get_guides",
    description="위험 유형(fall_edge·fall_opening·falling_object·collapse·caught)별 관련 KOSHA GUIDE(건설안전지침) "
                "번호와 명칭을 조회한다.",
    input_schema={
        "type": "object",
        "properties": {"hazards": {"type": "array", "items": {"type": "string"}}},
        "required": ["hazards"],
    },
)


def run(args: dict) -> dict:
    return {"guides": {h: [guides.get(g) for g in guides.for_hazard(h)] for h in args.get("hazards") or []}}
