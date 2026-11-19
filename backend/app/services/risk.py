"""날짜별 공간 위험 영역 = 공정(진행 작업) × BIM (engine.spatial_risk)."""
from engine import spatial_risk

from . import schedule
from .bim import get_model


def zones_on(day: str, storey: str | None = None) -> list[dict]:
    tasks = schedule.tasks_on(day, storey)
    return [z.to_dict() for z in spatial_risk.compute(get_model(), tasks)]
