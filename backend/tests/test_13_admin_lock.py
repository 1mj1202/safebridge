"""관리자 잠금 · 이해율 상한."""
import pytest

from app.core.config import get_settings


@pytest.fixture
def locked():
    s = get_settings()
    s.admin_password = "pw-test"
    yield
    s.admin_password = ""


def test_admin_api_locked_but_worker_open(client, locked):
    client.cookies.clear()
    me = client.get("/api/admin/me").json()
    assert me["required"] is True and me["ok"] is False
    assert client.get("/api/assessments").status_code == 401
    assert client.post("/api/agent/assess", json={"query": "내일 3층"}).status_code == 401
    assert client.get("/api/tbms/1/issues").status_code == 401
    assert client.get("/api/photos/1/image").status_code == 401
    assert client.get("/api/meta").status_code == 200          # 참고 자료·근로자 쪽은 열림
    assert client.get("/api/bim/model").status_code == 200
    assert client.post("/api/admin/login", json={"password": "wrong"}).status_code == 401
    r = client.post("/api/admin/login", json={"password": "pw-test"})
    assert r.status_code == 200 and "pw-test" not in r.headers["set-cookie"]
    assert client.get("/api/admin/me").json()["ok"] is True
    assert client.get("/api/assessments").status_code == 200
    client.post("/api/admin/logout")
    client.cookies.clear()
    assert client.get("/api/assessments").status_code == 401


def test_no_password_means_open(client):
    client.cookies.clear()
    me = client.get("/api/admin/me").json()
    assert me["required"] is False and me["ok"] is True
    assert client.get("/api/assessments").status_code == 200


def test_rate_never_over_100(client):
    a = client.post("/api/agent/assess", json={"query": "내일 3층 작업 위험 알려줘"}).json()
    client.post(f"/api/assessments/{a['id']}/approve")
    t = client.post(f"/api/assessments/{a['id']}/publish", json={}).json()
    for s in ("viewed", "understood", "understood"):
        client.post(f"/api/w/{t['token']}/ack", json={"lang": "vi", "status": s})
    assert client.get(f"/api/tbms/{t['id']}/status").json()["langs"]["vi"]["rate"] == 1.0
