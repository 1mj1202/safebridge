"""도구: 재해 패턴 조회 — 공종 → 과거 빈발 사고유형·원인·대책 + 유형별 유사사례."""
from app.llm.base import ToolSpec
from app.services import patterns

SPEC = ToolSpec(
    name="get_accident_patterns",
    description="공종(거푸집·철근·타설·양중)별로 과거 건설사고 사례에서 많았던 사고유형, 주요 원인·기인물, "
                "재발방지 대책과 유형별 유사 사고사례 ID 를 조회한다.",
    input_schema={
        "type": "object",
        "properties": {"trade": {"type": "string", "enum": ["거푸집", "철근", "타설", "양중"]}},
        "required": ["trade"],
    },
)


def run(args: dict) -> dict:
    trade = args["trade"]
    p = patterns.pattern(trade)
    for t in p["accident_types"]:
        # 주요 기인물마다 유사사례 2건씩(예: 추락 → 슬래브 단부 2건, 개구부 2건)
        t["similar_cases"] = [
            {"case_id": c["case_id"], "cause_object": c["cause_object"], "summary": c["raw_text"][:80],
             "severity": c["severity"]}
            for obj, _n in t["top_objects"]
            for c in patterns.similar(f"{trade} {t['type']} {obj}", k=2, trade=trade, accident_type=t["type"],
                                      cause_object=obj)
        ]
    return p
