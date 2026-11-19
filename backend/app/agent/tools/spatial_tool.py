"""도구: 공간 위험 계산 — 날짜(·층) 진행 작업 × BIM → 추락·낙하 위험 영역."""
from app.llm.base import ToolSpec
from app.services import risk

SPEC = ToolSpec(
    name="compute_spatial_risk",
    description="BIM 모델과 해당 날짜 공정으로 추락 위험 영역(슬래브 단부·개구부 둘레)과 낙하 위험 영역"
                "(상부 작업 직하부·외곽 지상)을 계산한다. 각 영역에 부재 ID 와 근거 조문 ID 가 붙는다.",
    input_schema={
        "type": "object",
        "properties": {
            "date": {"type": "string", "description": "작업일 YYYY-MM-DD"},
            "storey": {"type": "string", "description": "층 이름 (선택)"},
        },
        "required": ["date"],
    },
)


def run(args: dict) -> dict:
    zones = risk.zones_on(args["date"], args.get("storey") or None)
    return {"date": args["date"], "zones": [
        {k: z[k] for k in ("id", "kind", "label", "storey", "element_tags", "rule")} for z in zones
    ]}
