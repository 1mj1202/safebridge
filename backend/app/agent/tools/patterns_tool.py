"""도구: 재해 패턴 조회 — 공종 → 과거 빈발 사고유형·원인·대책 + 유형별 유사사례."""
from app.llm.base import ToolSpec
from app.services import patterns

SPEC = ToolSpec(
    name="search_cases",
    description="공종(거푸집·철근·타설·양중)별로 사망사고(SIF) 사례에서 많았던 사고유형, 주요 원인·기인물, "
                "재발방지 대책과 유형별 유사 사고사례 ID 를 검색한다.",
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


def _cut(text: str, n: int = 40) -> str:
    return text if len(text) <= n else text[:n] + "…"


def brief(p: dict) -> dict:
    """실제 사례 문장이 길어 로컬 모델이 느려지므로 상위 3개 유형·짧은 문장만 보낸다."""
    return {
        "trade": p["trade"], "total": p["total"], "note": p["note"],
        "accident_types": [
            {"type": t["type"], "count": t["count"],
             "top_objects": t["top_objects"],
             "top_causes": [_cut(c) for c, _n in t["top_causes"][:2]],
             "top_measures": [_cut(m) for m, _n in t["top_measures"][:2]],
             "similar_cases": [{"case_id": c["case_id"], "cause_object": c["cause_object"], "summary": _cut(c["summary"], 50)}
                               for c in t.get("similar_cases", [])[:4]]}
            for t in p["accident_types"][:3]
        ],
    }
