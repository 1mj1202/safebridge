"""홈 화면 앱 시작점: 오늘 작업일의 발행본을 먼저, 없으면 가장 가까운 다음 작업일 발행본으로 연다."""


def _publish(client, **kw) -> dict:
    a = client.post("/api/agent/assess", json={"query": "내일 3층 작업 위험 알려줘", **kw}).json()
    client.post(f"/api/assessments/{a['id']}/approve")
    return client.post(f"/api/assessments/{a['id']}/publish", json={}).json()


def test_launch_returns_latest_tbm(client):
    first = _publish(client)["token"]
    second = _publish(client)["token"]
    assert first != second
    assert client.get("/api/launch").json()["token"] == second


def test_launch_prefers_todays_work_date(client):
    # 시험 환경의 '오늘'은 2026-11-23 (conftest)
    today = _publish(client, date="2026-11-23")
    later = _publish(client, date="2026-11-25")
    r = client.get("/api/launch").json()
    assert r["token"] == today["token"] != later["token"]
    assert r["work_date"] == "2026-11-23"
    assert r["tbm_id"] == today["id"]
    assert r["published_at"].endswith("Z") and r["approved_at"].endswith("Z")


def test_worker_zones_show_which_published_version(client):
    t = _publish(client, date="2026-11-23")
    z = client.get(f"/api/w/{t['token']}/zones?lang=my").json()
    assert z["stamp"]["tbm_id"] == t["id"]
    assert z["stamp"]["work_date"] == "2026-11-23"
    assert z["stamp"]["published_at"] == t["published_at"]
    assert z["ui"]["work_day"] and z["ui"]["published"] and z["ui"]["approved"]
