"""발주처·감리(보기 전용)는 구역별 인원·교육 확인만 — 이름·업체·팀·언어·태그 시각은 서버에서 뺀다."""
from app.core.config import get_settings
from app.services import locations


def _login(client, role, pw):
    client.cookies.clear()
    assert client.post("/api/admin/login", json={"role": role, "password": pw}).status_code == 200


def test_viewer_gets_zone_counts_only(client):
    s = get_settings()
    s.admin_password, s.manager_password, s.viewer_password = "pw-safe", "pw-boss", "pw-view"
    s.staff_password_check = True
    try:
        _login(client, "safety", "pw-safe")
        full = client.get("/api/locations").json()
        _login(client, "viewer", "pw-view")
        anon = client.get("/api/locations").json()
    finally:
        s.admin_password = s.manager_password = s.viewer_password = ""
        s.staff_password_check = False
        client.cookies.clear()
    assert "anonymous" not in full
    assert anon["anonymous"] is True
    for w in anon["workers"]:
        assert w["name"] == w["company"] == w["team"] == w["lang"] == ""
        assert w["at"] is None and w["minutes"] is None and w["source"] is None
    here = [w for w in full["workers"] if w["zone"] and w["fresh"]]
    assert len(anon["workers"]) == len(here)
    assert sorted(w["zone"] for w in anon["workers"]) == sorted(w["zone"] for w in here)
    assert sum(w["understood"] for w in anon["workers"]) == sum(w["understood"] for w in here)


def test_anonymous_drops_people_details():
    snap = {"now": "", "fresh_hours": 12, "boxes": {}, "workers": [
        {"id": 7, "name": "김철수", "company": "A건설", "team": "철근", "lang": "my", "zone": "A동 3F-a", "source": "qr",
         "at": "x", "minutes": 3, "fresh": True, "understood": False},
        {"id": 8, "name": "이영희", "company": "B건설", "team": "형틀", "lang": "vi", "zone": "A동 3F-b", "source": "nfc",
         "at": "x", "minutes": 900, "fresh": False, "understood": True}]}
    out = locations.anonymous(snap)
    assert len(out["workers"]) == 1 and out["workers"][0]["zone"] == "A동 3F-a"
    assert "김철수" not in str(out) and "A건설" not in str(out)
