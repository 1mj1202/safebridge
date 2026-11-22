"""관리자 자동 로그아웃 — 마지막 사용(touch) 뒤 15분, 자동 새로고침은 연장하지 않음."""
import pytest

from app.core import admin_auth, admin_sessions
from app.core.config import get_settings


@pytest.fixture
def locked(client):
    s = get_settings()
    s.admin_password, s.staff_password_check = "pw-test", True
    client.cookies.clear()
    yield
    s.admin_password, s.staff_password_check = "", False
    client.cookies.clear()


def _login(client) -> str:
    r = client.post("/api/admin/login", json={"password": "pw-test"})
    assert r.status_code == 200 and r.json()["idle_seconds"] == 15 * 60
    return client.cookies.get(admin_auth.COOKIE)


def test_expires_after_15_min_idle(client, locked):
    sid = _login(client)
    assert client.get("/api/assessments").status_code == 200
    admin_sessions._age_for_test(sid, 15 * 60 + 1)
    assert client.get("/api/assessments").status_code == 401
    assert client.get("/api/admin/me").json()["ok"] is False
    assert client.post("/api/admin/touch").status_code == 401   # 끝난 뒤엔 연장 불가


def test_polling_does_not_extend_but_touch_does(client, locked):
    sid = _login(client)
    admin_sessions._age_for_test(sid, 14 * 60)
    assert client.get("/api/assessments").status_code == 200    # 자동 새로고침 같은 요청
    admin_sessions._age_for_test(sid, 2 * 60)                   # 연장 안 됐으니 16분 → 만료
    assert client.get("/api/assessments").status_code == 401

    sid = _login(client)
    admin_sessions._age_for_test(sid, 14 * 60)
    assert client.post("/api/admin/touch").status_code == 200   # 화면을 씀 → 다시 셈
    admin_sessions._age_for_test(sid, 14 * 60)
    assert client.get("/api/assessments").status_code == 200


def test_logout_kills_server_session(client, locked):
    sid = _login(client)
    client.post("/api/admin/logout")
    client.cookies.set(admin_auth.COOKIE, sid)                  # 옛 쿠키를 다시 써도
    assert client.get("/api/assessments").status_code == 401


def test_cookie_remembers_device_but_server_still_expires(client, locked):
    r = client.post("/api/admin/login", json={"password": "pw-test"})
    sc = r.headers["set-cookie"].lower()
    assert "max-age=2592000" in sc and "httponly" in sc        # 30일 기억 → 다시 열면 자동 로그인
    sid = client.cookies.get(admin_auth.COOKIE)
    admin_sessions._age_for_test(sid, 15 * 60 + 1)               # 그래도 15분 안 쓰면 끝
    assert client.get("/api/admin/me").json()["ok"] is False
