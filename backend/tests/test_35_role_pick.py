"""비밀번호 확인 끔(기본, 사용자 결정 2026-11-22): 부류를 고르기만 하면 들어가고 권한은 부류대로."""
import pytest

from app.core.config import get_settings


@pytest.fixture
def pick(client):
    s = get_settings()
    s.admin_password, s.manager_password, s.viewer_password = "a", "b", "c"
    client.cookies.clear()
    yield
    s.admin_password = s.manager_password = s.viewer_password = ""
    client.cookies.clear()


def test_pick_role_without_password(client, pick):
    me = client.get("/api/admin/me").json()
    assert me["required"] and not me["ok"] and [r["id"] for r in me["roles"]] == ["safety", "manager", "viewer"]
    assert client.get("/api/assessments").status_code == 401  # 고르기 전에는 막힘
    r = client.post("/api/admin/login", json={"role": "viewer"}).json()
    assert r["ok"] and r["perms"] == ["view"] and r["idle_seconds"] >= 24 * 3600
    assert client.get("/api/assessments").status_code == 200
    assert client.post("/api/agent/assess", json={"query": "내일 3층"}).status_code == 403  # 보기 전용
    assert client.post("/api/admin/login", json={"role": "boss"}).status_code == 401
    safety = client.post("/api/admin/login", json={"role": "safety"}).json()
    assert "approve" not in safety["perms"]  # 승인은 현장소장


def test_only_one_password_still_offers_all_roles(client):
    s = get_settings()
    s.admin_password = "a"
    try:
        assert [r["id"] for r in client.get("/api/admin/me").json()["roles"]] == ["safety", "manager", "viewer"]
    finally:
        s.admin_password = ""
