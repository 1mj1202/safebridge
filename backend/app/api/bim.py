"""BIM·4D·공간 위험 API."""
from fastapi import APIRouter, Query

from app.services import bim, risk, schedule, weather

router = APIRouter(prefix="/api", tags=["bim"])
DATE = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$")


@router.get("/bim/model")
def model():
    return bim.viewer_payload()


@router.get("/schedule")
def full_schedule():
    start, end = schedule.date_range()
    return {"start": start, "end": end, "tasks": list(schedule.all_tasks())}


@router.get("/risk")
def risk_on(date: str = DATE, storey: str | None = None):
    tasks = schedule.tasks_on(date, storey)
    return {
        "date": date,
        "tasks": tasks,
        "zones": risk.zones_on(date, storey),
        "element_status": schedule.element_status(date),
        "weather": weather.judge(date, sorted({t["trade"] for t in tasks})),
    }
