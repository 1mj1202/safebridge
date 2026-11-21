"""오늘 작업 단계·장비에 맞는 대책만 '오늘 적용', 나머지는 참고 (기획서 별첨 2-4)."""
from app.services import patterns, schedule, work_context


def test_context_from_task_names():
    assert work_context.of_tasks([{"name": "3F 기둥·슬래브 거푸집 설치"}])["stage"] == "조립"
    assert work_context.of_tasks([{"name": "3F 자재 양중(타워크레인)"}])["equipment"] == {"타워크레인"}


def test_mismatch_reasons():
    ctx = {"stage": "조립", "equipment": {"타워크레인"}}
    assert work_context.mismatch("거푸집 동바리 해체", ctx) == "해체 작업 사례"
    assert work_context.mismatch("거푸집동바리 조립하거나 해체하는 작업 시", ctx) is None  # 두 단계 모두 → 무관
    assert work_context.mismatch("크롤라 크레인의 작업 시 신호방법", ctx) == "크롤러크레인 사례"
    assert work_context.mismatch("타워크레인 신호수 배치", ctx) is None


def test_demo_day_measures_exclude_other_stage_and_equipment():
    tasks = schedule.tasks_on("2026-11-24")
    bad = ("해체", "크롤라", "크롤러", "차량계", "이동식크레인", "이동식 크레인")
    for trade, acc in (("거푸집", "낙하"), ("거푸집", "붕괴"), ("양중", "협착"), ("양중", "낙하")):
        ctx = work_context.of_tasks([t for t in tasks if t["trade"] == trade])
        fit, ref = patterns.measures_for(trade, acc, None, ctx)
        assert fit, (trade, acc)
        assert not [m for m in fit if any(b in m for b in bad) and work_context.mismatch(m, ctx)]
        assert all(r["reason"] and r["case_id"] for r in ref)
    ctx = work_context.of_tasks([t for t in tasks if t["trade"] == "거푸집"])
    fit, _ = patterns.measures_for("거푸집", "붕괴", None, ctx)
    assert not any("해체작업" in m for m in fit)
