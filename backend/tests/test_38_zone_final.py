"""구역별 마지막 줄: 출입 통제 구역은 출입금지 지침, 관리자 한마디는 작업 구역에만."""
from app.services import glossary


def _published(client, memo: str) -> str:
    a = client.post("/api/agent/assess", json={"query": "내일 3층 작업 위험 알려줘"}).json()
    client.post(f"/api/assessments/{a['id']}/approve")
    return client.post(f"/api/assessments/{a['id']}/publish", json={"memo": memo}).json()["token"]


def test_restricted_zone_ends_with_no_entry_and_no_memo(client):
    token = _published(client, "단부 작업 전 안전대를 거세요")
    zones = client.get(f"/api/w/{token}/zones?lang=ko").json()["zones"]
    closed = next(z["zone"] for z in zones if z["restricted"])
    open_ = next(z["zone"] for z in zones if not z["restricted"])
    for lang in ("ko", "my"):
        b = client.get(f"/api/w/{token}/brief", params={"zone": closed, "lang": lang}).json()
        assert b["memo"] == ""
        assert b["final"] == glossary.phrase("chat.restricted_final", lang)
    w = client.get(f"/api/w/{token}/brief", params={"zone": open_, "lang": "ko"}).json()
    assert w["memo"] == "단부 작업 전 안전대를 거세요"
    assert w["final"] is None
