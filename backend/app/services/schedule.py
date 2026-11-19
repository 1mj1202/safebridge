"""4D 공정 서비스 — 날짜별 진행 작업, 부재별 공정 상태(완료·진행·미시공)."""
from fnmatch import fnmatch
from functools import lru_cache

from engine import schedule_gen

from .bim import get_model


@lru_cache
def all_tasks() -> tuple[dict, ...]:
    return tuple(schedule_gen.generate(floors=len(get_model().storeys)))


def tasks_on(day: str, storey: str | None = None) -> list[dict]:
    return [
        t for t in all_tasks()
        if t["start"] <= day <= t["end"] and (storey is None or t["storey"] == storey)
    ]


def element_status(day: str) -> dict[str, str]:
    """부재 Tag → done | active | planned."""
    status: dict[str, str] = {}
    for el in get_model().elements:
        related = [t for t in all_tasks() if any(fnmatch(el.tag, p) for p in t["element_tags"])
                   and t["trade"] not in ("양중", "양생")]
        if not related:
            continue
        if all(t["end"] < day for t in related):
            status[el.tag] = "done"
        elif any(t["start"] <= day for t in related):
            status[el.tag] = "active"
        else:
            status[el.tag] = "planned"
    return status


def date_range() -> tuple[str, str]:
    ts = all_tasks()
    return min(t["start"] for t in ts), max(t["end"] for t in ts)
