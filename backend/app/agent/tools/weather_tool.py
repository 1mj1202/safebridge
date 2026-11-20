"""도구: 기상 판정 — 예보값 × 작업중지 기준."""
from app.llm.base import ToolSpec
from app.services import weather

SPEC = ToolSpec(
    name="get_weather",
    description="작업일 기상예보(순간풍속·강수·기온)를 조회하고 공종별 작업중지·주의 기준을 판정한다.",
    input_schema={
        "type": "object",
        "properties": {
            "date": {"type": "string"},
            "trades": {"type": "array", "items": {"type": "string"}, "description": "진행 공종 목록"},
        },
        "required": ["date"],
    },
)


def run(args: dict) -> dict:
    return weather.judge(args["date"], args.get("trades") or [])
