"""시연용 가상 근로자 — 발행 TBM 구역에 팀 구성대로 들어가고, 늘 '방금 태그'로 보이며, 다시 돌려도 중복되지 않는다."""
from app.core.db import SessionLocal
from sqlalchemy import select

from app.models import Worker
from app.services import demo_workers, locations


def _publish(client):
    a = client.post("/api/agent/assess", json={"query": "내일 3층 작업 위험 알려줘"}).json()
    client.post(f"/api/assessments/{a['id']}/approve")
    return client.post(f"/api/assessments/{a['id']}/publish", json={}).json()


def test_seed_places_demo_workers(client):
    _publish(client)
    with SessionLocal() as db:
        r = demo_workers.seed(db)
        assert r["workers"] > 0 and r["zones"]
        again = demo_workers.seed(db)  # 재실행은 갈아끼움
        assert again["workers"] == r["workers"]
        snap = locations.snapshot(db)
        ids = set(db.scalars(select(Worker.id).where(Worker.pin_hash == demo_workers.DEMO)))
        demo = [w for w in snap["workers"] if w["id"] in ids]
        assert len(demo) == r["workers"]
        assert all(w["fresh"] and w["zone"] in r["zones"] and w["source"] in ("qr", "nfc") for w in demo)
        assert all(2 <= w["minutes"] <= 45 for w in demo)
        assert set(snap["boxes"]) >= set(r["zones"])
        assert any(w["understood"] for w in demo) and not all(w["understood"] for w in demo)
        assert demo_workers.clear(db) == r["workers"]
        assert demo_workers.clear(db) == 0
