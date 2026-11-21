"""근로자 가입·로그인 → 구역 태그로 위치 갱신 → 관리자 현재 위치 · 구역 이해 확인."""
import pytest

from app.core import worker_auth

CO = "(가상) 한빛형틀"


@pytest.fixture(scope="module")
def tbm(client):
    a = client.post("/api/agent/assess", json={"query": "내일 3층 작업 위험 알려줘"}).json()
    client.post(f"/api/assessments/{a['id']}/approve")
    return client.post(f"/api/assessments/{a['id']}/publish", json={}).json()


def _me(client):
    return client.get("/api/workers/me").json()["worker"]


def test_companies_and_ui(client):
    r = client.get("/api/workers/companies", params={"lang": "vi"}).json()
    assert [c["company"] for c in r["companies"]][:2] == [CO, "(가상) 대한철근"]
    assert r["ui"]["signup"] == "Đăng ký"


def test_signup_login_lock(client):
    client.cookies.clear()
    assert _me(client) is None
    bad = client.post("/api/workers/signup", json={"name": "응우옌 반", "company": "없는 업체", "lang": "vi", "pin": "1234"})
    assert bad.status_code == 422
    assert client.post("/api/workers/signup", json={"name": "a", "company": CO, "lang": "vi", "pin": "12a4"}).status_code == 422
    r = client.post("/api/workers/signup", json={"name": " 응우옌  반 ", "company": CO, "lang": "vi", "pin": "1234"})
    assert r.status_code == 200 and "1234" not in r.headers["set-cookie"]
    assert _me(client)["name"] == "응우옌 반" and _me(client)["team"] == "형틀팀"
    assert client.post("/api/workers/signup", json={"name": "응우옌 반", "company": CO, "lang": "vi", "pin": "9999"}).status_code == 409
    client.post("/api/workers/logout")
    client.cookies.clear()
    assert _me(client) is None
    for _ in range(worker_auth.MAX_FAILS):
        assert client.post("/api/workers/login", json={"name": "응우옌 반", "company": CO, "pin": "0000"}).status_code == 401
    assert client.post("/api/workers/login", json={"name": "응우옌 반", "company": CO, "pin": "1234"}).status_code == 429
    worker_auth.clear_fails((CO, "응우옌 반"))
    assert client.post("/api/workers/login", json={"name": "응우옌 반", "company": CO, "pin": "1234"}).status_code == 200
    assert _me(client)["lang"] == "vi"


def test_checkin_updates_location_and_understood(client, tbm):
    tok = tbm["token"]
    client.cookies.clear()
    assert client.post(f"/api/w/{tok}/checkin", json={"zone": "A동 3F-a"}).status_code == 401  # 가입 없이 보기
    client.post("/api/workers/signup", json={"name": "Somchai", "company": "(가상) 대한철근", "lang": "th", "pin": "4321"})
    assert client.post(f"/api/w/{tok}/checkin", json={"zone": "없는곳"}).status_code == 404
    assert client.post(f"/api/w/{tok}/checkin", json={"zone": "A동 3F-a", "source": "pick"}).status_code == 422
    assert client.post(f"/api/w/{tok}/checkin", json={"zone": "A동 3F-a", "source": "qr"}).json() == \
        {"zone": "A동 3F-a", "understood": False}
    r = client.post(f"/api/w/{tok}/ack", json={"lang": "th", "status": "understood", "zone": "A동 3F-a"}).json()
    assert r["zone_understood"] is True
    again = client.post(f"/api/w/{tok}/checkin", json={"zone": "A동 3F-a", "source": "nfc"}).json()
    assert again["understood"] is True  # 같은 구역 다시 태그: 이해 확인 유지
    client.post(f"/api/w/{tok}/checkin", json={"zone": "A동 3F-b", "source": "nfc"})

    snap = client.get("/api/locations").json()
    me = next(w for w in snap["workers"] if w["name"] == "Somchai")
    assert me["zone"] == "A동 3F-b" and me["source"] == "nfc" and me["fresh"] and not me["understood"]
    assert me["minutes"] == 0 and snap["boxes"]["A동 3F-b"]["min"][2] > 0
    assert "pin_hash" not in me and "token" not in me


def test_anonymous_tally_can_be_skipped(client, tbm):
    tok = tbm["token"]
    before = client.get(f"/api/tbms/{tbm['id']}/status").json()
    client.post(f"/api/w/{tok}/ack", json={"lang": "th", "status": "understood", "zone": "A동 3F-b", "tally": False})
    assert client.get(f"/api/tbms/{tbm['id']}/status").json() == before


def test_locations_locked_for_non_admin(client):
    from app.core.config import get_settings

    s = get_settings()
    s.admin_password = "pw"
    try:
        client.cookies.clear()
        assert client.get("/api/locations").status_code == 401
    finally:
        s.admin_password = ""


def test_legacy_pick_record_is_not_a_location(client, tbm):
    """PR #24 때 저장된 source='pick' 기록은 위치·태그 방식으로 보이지 않는다(관리자 화면 'undefined' 방지)."""
    from app.core.db import SessionLocal
    from app.models import CheckIn, Worker
    tok = tbm["token"]
    client.cookies.clear()
    client.post("/api/workers/signup", json={"name": "Legacy", "company": CO, "lang": "vi", "pin": "1111"})
    client.post(f"/api/w/{tok}/checkin", json={"zone": "A동 3F-a", "source": "qr"})
    with SessionLocal() as db:
        w = db.query(Worker).filter_by(name="Legacy").one()
        db.get(CheckIn, w.last_checkin_id).source = "pick"
        db.commit()
    me = next(w for w in client.get("/api/locations").json()["workers"] if w["name"] == "Legacy")
    assert me["zone"] is None and me["source"] is None
