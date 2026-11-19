"""관리자 초안 → 승인 → 발행 → 근로자 확인·신고 → 현황."""


def test_full_tbm_flow(client):
    a = client.post("/api/agent/assess", json={"query": "내일 3층 작업 위험 알려줘"}).json()
    assert a["status"] == "draft"
    r = client.put(f"/api/assessments/{a['id']}", json={"items": [{"id": "H1", "level": "중"}]})
    assert r.json()["draft"]["items"][0]["level"] == "중"
    assert client.post(f"/api/assessments/{a['id']}/publish", json={}).status_code == 409
    client.post(f"/api/assessments/{a['id']}/approve")
    assert client.put(f"/api/assessments/{a['id']}", json={"summary": "x"}).status_code == 409
    t = client.post(f"/api/assessments/{a['id']}/publish", json={"memo": "안전대 꼭 거세요"}).json()
    assert set(t["cards"]) == {"ko", "en", "zh", "vi", "th"}
    assert all(v["rate"] == 1.0 for v in t["translation_check"]["phrases"].values())

    w = client.get(f"/api/w/{t['token']}", params={"lang": "th"}).json()
    assert [c["type"] for c in w["cards"]] == ["place", "hazard", "check"]
    assert client.get(f"/api/w/{t['token']}", params={"lang": "xx"}).status_code == 422
    for s in ("viewed", "viewed", "understood"):
        client.post(f"/api/w/{t['token']}/ack", json={"lang": "th", "status": s})
    client.post(f"/api/w/{t['token']}/report", json={"lang": "th", "text": "ราวกันตกหลวม"})
    st = client.get(f"/api/tbms/{t['id']}/status").json()
    assert st["langs"]["th"] == {"viewed": 2, "understood": 1, "question": 0, "rate": 0.5, "needs_followup": True}
    assert st["reports"][0]["text_original"] == "ราวกันตกหลวม"


def test_risk_and_model_endpoints(client):
    r = client.get("/api/risk", params={"date": "2026-11-24"}).json()
    assert any(z["kind"] == "fall" for z in r["zones"])
    assert r["element_status"]["SLB-1F"] == "done" and r["element_status"]["SLB-3F"] == "active"
    assert client.get("/api/risk", params={"date": "bad"}).status_code == 422
    m = client.get("/api/bim/model").json()
    assert m["elements"][0]["vertices"]
