"""원본 분류 → SafeBridge 분류(공종 4종·사고유형·기인물) 대응표. 변환 규칙은 여기 한 곳에만 둔다."""
from __future__ import annotations

TRADES = ("거푸집", "철근", "타설", "양중")

# SIF 단위작업명 접두 → 공종 (인양 작업은 양중)
SIF_UNIT_TRADE = {
    "2.1.4": "양중", "2.2.3": "양중", "2.4.4": "양중",
    "2.1.": "거푸집", "2.2.": "거푸집", "2.3.": "철근", "2.4.": "타설",
}
CRANE_OBJECTS = ("이동식크레인", "타워크레인", "크레인")

ACCIDENT_TYPE = {"추락": "추락", "낙하": "낙하", "붕괴": "붕괴", "끼임": "협착", "깔림": "협착",
                 "부딪힘": "충돌", "전도": "넘어짐"}


def sif_trade(unit: str, obj: str) -> str | None:
    if any(k in obj for k in CRANE_OBJECTS):
        return "양중"
    for prefix, trade in SIF_UNIT_TRADE.items():
        if unit.startswith(prefix):
            return trade
    return None


def accident_type(raw: str, obj: str = "") -> str:
    # 거푸집·동바리에 깔린 사고는 무너짐(붕괴)으로 본다
    if raw == "깔림" and obj == "거푸집·동바리":
        return "붕괴"
    return ACCIDENT_TYPE.get(raw, raw)


def cause_object(raw: str) -> str:
    """기인물 정규화. 위험 항목이 기인물로 거르는 '슬래브 단부'·'개구부'는 반드시 이 이름으로 맞춘다."""
    if "슬라브단부" in raw or "슬래브" in raw and "단부" in raw:
        return "슬래브 단부"
    if "개구부" in raw or "피트" in raw:
        return "개구부"
    if "작업발판 일체형" in raw:
        return "갱폼"
    if raw in ("거푸집", "동바리") or "동바리" in raw:
        return "거푸집·동바리"
    if any(k in raw for k in CRANE_OBJECTS):
        return "크레인·인양물"
    return raw or "분류불능"


# 위험요소 프로파일: 객체(중) → 공종, 인적피해 → 사고유형
PROFILE_OBJECT_TRADE = {
    "거푸집": "거푸집", "시스템동바리": "거푸집", "강관동바리": "거푸집", "데크플레이트": "거푸집",
    "철근": "철근", "콘크리트펌프": "타설", "기중기(이동식크레인 등)": "양중",
}


def profile_type(injury: str, obj: str) -> str | None:
    if injury.startswith("떨어짐"):
        return "추락"
    if injury.startswith("물체에 맞음"):
        return "낙하"
    if injury == "깔림":
        return "붕괴" if "동바리" in obj or obj in ("거푸집", "데크플레이트") else "협착"
    if injury.startswith("끼임"):
        return "협착"
    if injury.startswith("부딪힘"):
        return "충돌"
    return None
