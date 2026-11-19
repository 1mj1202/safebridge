"""가상 4D 공정표 생성기 — 층별 골조 사이클(기둥 철근 → 거푸집 → 슬래브 철근 → 타설 → 양생).

작업일은 월~토(일요일 휴무). 시연 시나리오: 3F 거푸집 설치가 ANCHOR 날짜에 시작하도록 1F 시작일을 역산한다.
"""
from __future__ import annotations

from datetime import date, timedelta

# (코드, 작업명, 공종, 기간(작업일), 투입 인원)
CYCLE = [
    ("COLRB", "기둥 철근 배근", "철근", 1, 6),
    ("FORM", "기둥·슬래브 거푸집 설치", "거푸집", 3, 10),
    ("SLBRB", "슬래브 철근 배근", "철근", 2, 8),
    ("POUR", "슬래브 콘크리트 타설", "타설", 1, 12),
    ("CURE", "콘크리트 양생", "양생", 3, 0),
]
LIFT = ("LIFT", "자재 양중(타워크레인)", "양중", 4)


def _next_workday(d: date) -> date:
    d += timedelta(days=1)
    while d.weekday() == 6:
        d += timedelta(days=1)
    return d


def _add_workdays(d: date, n: int) -> date:
    """d 가 1일차일 때 n 일차 날짜."""
    for _ in range(n - 1):
        d = _next_workday(d)
    return d


def _prev_workday(d: date) -> date:
    d -= timedelta(days=1)
    while d.weekday() == 6:
        d -= timedelta(days=1)
    return d


def generate(floors: int = 5, anchor: date = date(2026, 11, 24), anchor_floor: int = 3) -> list[dict]:
    # 층 사이클 길이(다음 층 기둥 철근은 타설 다음 작업일)
    per_floor = sum(c[3] for c in CYCLE[:4])
    start = anchor
    # 3F FORM 시작일 → 3F COLRB → 1F COLRB
    start = _prev_workday(start)
    for _ in range((anchor_floor - 1) * per_floor):
        start = _prev_workday(start)

    tasks: list[dict] = []
    floor_start = start
    for i in range(floors):
        level = f"{i + 1}F"
        d = floor_start
        form_start = None
        for code, name, trade, dur, crew in CYCLE:
            end = _add_workdays(d, dur)
            if code == "FORM":
                form_start = d
            tags = [f"COL-{level}-*"] if code == "COLRB" else [f"SLB-{level}", f"COL-{level}-*"]
            tasks.append({
                "id": f"T-{level}-{code}", "name": f"{level} {name}", "trade": trade, "storey": level,
                "start": d.isoformat(), "end": end.isoformat(), "crew": crew, "element_tags": tags,
            })
            if code == "POUR":
                next_floor = _next_workday(end)
            d = _next_workday(end)
        lift_end = _add_workdays(form_start, LIFT[3])
        tasks.append({
            "id": f"T-{level}-{LIFT[0]}", "name": f"{level} {LIFT[1]}", "trade": LIFT[2], "storey": level,
            "start": form_start.isoformat(), "end": lift_end.isoformat(), "crew": 3,
            "element_tags": [f"SLB-{level}"],
        })
        floor_start = next_floor
    return tasks
