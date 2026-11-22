"""이용자 부류별 로그인·권한 — 안전관리자·현장소장(승인)·발주처/감리(보기 전용), 세션은 DB 에 남는다."""
import pytest

from app.core import admin_auth, admin_sessions
from app.core.config import get_settings


@pytest.fixture
def three(client):
    s = get_settings()
    s.admin_password, s.manager_password, s.viewer_password = "pw-safe", "pw-boss", "pw-view"
    s.staff_password_check = True
    client.cookies.clear()
    yield
    s.admin_password = s.manager_password = s.viewer_password = ""
    s.staff_password_check = False
    client.cookies.clear()


def _as(client, role, pw):
    client.cookies.clear()
    r = client.post("/api/admin/login", json={"role": role, "password": pw})
    assert r.status_code == 200, r.text
    return r.json()


def _draft(client):
    _as(client, "safety", "pw-safe")
    return client.post("/api/agent/assess", json={"query": "3층 작업 위험 알려줘"}).json()


def test_me_lists_enabled_roles(client, three):
    me = client.get("/api/admin/me").json()
    assert me["ok"] is False and [r["id"] for r in me["roles"]] == ["safety", "manager", "viewer"]


def test_wrong_role_password_rejected(client, three):
    assert client.post("/api/admin/login", json={"role": "viewer", "password": "pw-safe"}).status_code == 401
    assert client.post("/api/admin/login", json={"role": "boss", "password": "pw-boss"}).status_code == 401


def test_only_manager_approves(client, three):
    a = _draft(client)
    assert client.post(f"/api/assessments/{a['id']}/approve", json={}).status_code == 403   # 안전관리자
    me = _as(client, "manager", "pw-boss")
    assert me["label"] == "현장소장·원청" and "approve" in me["perms"] and "edit" not in me["perms"]
    assert client.put(f"/api/assessments/{a['id']}", json={"items": []}).status_code == 403
    assert client.post(f"/api/assessments/{a['id']}/approve", json={}).status_code == 200


def test_viewer_reads_only(client, three):
    a = _draft(client)
    _as(client, "viewer", "pw-view")
    assert client.get(f"/api/assessments/{a['id']}").status_code == 200
    assert client.get("/api/locations").status_code == 200
    assert client.post("/api/agent/assess", json={"query": "3층"}).status_code == 403
    assert client.post(f"/api/assessments/{a['id']}/approve", json={}).status_code == 403


def test_safety_approves_when_no_manager_password(client, three):
    get_settings().manager_password = ""
    a = _draft(client)
    assert client.post(f"/api/assessments/{a['id']}/approve", json={}).status_code == 200


def test_session_survives_in_db(client, three):
    _as(client, "viewer", "pw-view")
    sid = client.cookies.get(admin_auth.COOKIE)
    assert admin_sessions.role(sid) == "viewer"   # 메모리가 아니라 DB 에서 읽음 → 재시작해도 유지
