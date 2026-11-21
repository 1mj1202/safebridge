"""작업 조건(작업 단계·장비)으로 사고사례·대책이 오늘 작업에 맞는지 가린다 (기획서 별첨 2-4: 공종키 + 작업프로세스 + 위치).

공정 작업명("3F 기둥·슬래브 거푸집 설치", "3F 자재 양중(타워크레인)")에서 단계·장비를 읽고,
사례의 작업명·대책 문장이 다른 단계(해체)나 다른 장비(크롤러크레인·차량계 건설기계 등)를 말하면 '참고'로 돌린다.
"""
from __future__ import annotations

# 단계: 작업명에 이 낱말이 있으면 그 단계
STAGES = {"조립": ("설치", "조립", "인양"), "해체": ("해체", "반출")}
# 장비: 대표 이름 → 문장에서 찾는 표기
EQUIPMENT = {
    "타워크레인": ("타워크레인",),
    "이동식크레인": ("이동식크레인", "이동식 크레인", "카고크레인", "트럭크레인"),
    "크롤러크레인": ("크롤라", "크롤러"),
    "차량계 건설기계": ("차량계", "건설기계", "후방센서", "굴착기", "덤프"),
    "고소작업대": ("고소작업대",),
    "기중기 탑승설비": ("탑승설비",),
}


def _stage(text: str) -> str | None:
    hits = [s for s, words in STAGES.items() if any(w in text for w in words)]
    return hits[0] if len(hits) == 1 else None  # "조립하거나 해체" 처럼 둘 다면 단계 무관


def _equipment(text: str) -> set[str]:
    return {e for e, words in EQUIPMENT.items() if any(w in text for w in words)}


def of_tasks(tasks: list[dict]) -> dict:
    """그날 공종 작업들의 단계·장비. 단계가 섞이면(설치와 해체가 함께) 단계 조건은 쓰지 않는다."""
    stages = {s for t in tasks if (s := _stage(t["name"]))}
    equip = set().union(*(_equipment(t["name"]) for t in tasks)) if tasks else set()
    return {"stage": next(iter(stages)) if len(stages) == 1 else None, "equipment": equip}


def mismatch(text: str, ctx: dict) -> str | None:
    """오늘 작업 조건과 다르면 그 이유(화면 표시용), 맞거나 판단할 수 없으면 None."""
    st = _stage(text)
    if ctx.get("stage") and st and st != ctx["stage"]:
        return f"{st} 작업 사례"
    other = _equipment(text) - set(ctx.get("equipment") or ())
    if other:
        return f"{'·'.join(sorted(other))} 사례"
    return None
