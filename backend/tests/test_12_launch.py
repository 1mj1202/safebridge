"""홈 화면 앱 시작점: 가장 최근 발행된 TBM 으로 연다."""


def _publish(client) -> str:
    a = client.post("/api/agent/assess", json={"query": "내일 3층 작업 위험 알려줘"}).json()
    client.post(f"/api/assessments/{a['id']}/approve")
    return client.post(f"/api/assessments/{a['id']}/publish", json={}).json()["token"]


def test_launch_returns_latest_tbm(client):
    first = _publish(client)
    second = _publish(client)
    assert first != second
    assert client.get("/api/launch").json() == {"token": second}
