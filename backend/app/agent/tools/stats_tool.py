"""도구: 사고 통계 조회 — 표준 공종키 → 공종 사고 빈도·사망·고령·외국인 비중."""
from app.llm.base import ToolSpec
from app.services import crosswalk, stats

SPEC = ToolSpec(
    name="get_accident_stats",
    description="표준 공종키로 국토안전관리원 건설사고(2019-2025)의 해당 공종 사고 건수·사망자·60세 이상·외국인 비중과 "
                "전체 사고 중 비중(빈도 가중치)을 조회한다.",
    input_schema={
        "type": "object",
        "properties": {"work_key": {"type": "string"}},
        "required": ["work_key"],
    },
)


def run(args: dict) -> dict:
    k = next((x for x in crosswalk.keys() if x["key"] == args["work_key"]), None)
    row = stats.by_work(k["kistec01"]) if k else None
    return {"work_key": args["work_key"], "kistec01": k and k["kistec01"], "stats": row,
            "weight": stats.weight(k["kistec01"]) if k else 1.0, "hourly": stats.hourly_peak()}
