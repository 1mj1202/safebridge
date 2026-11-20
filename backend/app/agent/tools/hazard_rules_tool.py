"""도구: 위험 규칙 조회 — 표준 공종키 → 위험요소 프로파일(사고유형별 사고가능성 P·심각성 S·주요 원인)."""
from app.llm.base import ToolSpec
from app.services import crosswalk, risk_profile

SPEC = ToolSpec(
    name="query_hazard_rules",
    description="표준 공종키(RC-FORM·RC-REBAR·RC-POUR·LIFT-CRANE)로 국토안전관리원 위험요소 프로파일의 "
                "사고유형별 사고가능성(P)·심각성(S) 평균과 주요 원인을 조회한다.",
    input_schema={
        "type": "object",
        "properties": {"work_key": {"type": "string", "enum": ["RC-FORM", "RC-REBAR", "RC-POUR", "LIFT-CRANE"]}},
        "required": ["work_key"],
    },
)


def run(args: dict) -> dict:
    k = next((x for x in crosswalk.keys() if x["key"] == args["work_key"]), None)
    if not k:
        return {"work_key": args["work_key"], "rules": [], "error": "알 수 없는 공종키"}
    rules = [r for r in risk_profile.all_rows() if r["trade"] == k["trade"]]
    return {"work_key": k["key"], "name": k["name"], "source": risk_profile.source(),
            "rules": sorted(rules, key=lambda r: -r["likelihood"] * r["severity"])}
