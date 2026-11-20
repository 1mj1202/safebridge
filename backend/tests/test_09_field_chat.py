"""근로자 현장 챗봇 — 구역 선택 → 브리핑 → 질문 → 이슈(긴급도·전달) → 관리자 회신."""
import pytest

from app.services import glossary, issues


@pytest.fixture(scope="module")
def tbm(client):
    a = client.post("/api/agent/assess", json={"query": "내일 3층 작업 위험 알려줘"}).json()
    client.post(f"/api/assessments/{a['id']}/approve")
    return client.post(f"/api/assessments/{a['id']}/publish", json={}).json()


def test_zones_and_brief(client, tbm):
    z = client.get(f"/api/w/{tbm['token']}/zones", params={"lang": "vi"}).json()
    names = [r["zone"] for r in z["zones"]]
    assert "A동 3F-a" in names and z["ui"]["greet"] != "안녕하세요! 오늘 어디에서 일하나요?"
    b = client.get(f"/api/w/{tbm['token']}/brief", params={"zone": "A동 3F-a", "lang": "vi"}).json()
    assert [s["type"] for s in b["sections"]] == ["weather", "build", "safety"]
    safety = b["sections"][2]["lines"]
    assert safety and [s["rank"] for s in safety] == sorted(s["rank"] for s in safety)
    assert b["teams"] and b["checks"]
    r = client.get(f"/api/w/{tbm['token']}/brief", params={"zone": "A동 2F-a", "lang": "ko"}).json()
    assert r["restricted"] and r["sections"][1]["lines"][0]["text"].startswith("이 구역은")
    assert client.get(f"/api/w/{tbm['token']}/brief", params={"zone": "없는곳"}).status_code == 404


def test_chat_falls_back_to_lead_offline(client, tbm):
    r = client.post(f"/api/w/{tbm['token']}/chat", json={"lang": "th", "zone": "A동 3F-a", "message": "ใส่อะไร"})
    assert r.json() == {"text": glossary.phrase("chat.ask_lead", "th"), "grounded": False}


def test_issue_route_urgency_and_answer(client, tbm):
    r = client.post(f"/api/w/{tbm['token']}/issue",
                    json={"lang": "ko", "zone": "A동 3F-a", "text": "동바리가 흔들려요"}).json()
    assert r["urgency"] == "urgent" and len(r["messages"]) == 2
    assert r["route"][0].endswith("반장") and "안전관리자" in r["route"]
    inbox = client.get(f"/api/tbms/{tbm['id']}/issues").json()
    assert inbox[0]["id"] == r["id"] and inbox[0]["status"] == "open"
    assert client.get(f"/api/w/{tbm['token']}/issues/{r['id']}", params={"key": "wrong"}).status_code == 404
    client.post(f"/api/issues/{r['id']}/answer", json={"text_ko": "작업 멈추고 대피하세요. 지금 갑니다"})
    s = client.get(f"/api/w/{tbm['token']}/issues/{r['id']}", params={"key": r["key"]}).json()
    assert s["status"] == "answered" and s["answer"].startswith("작업 멈추고")


def test_triage_keywords_offline():
    assert issues.triage("난간이 헐거워요", "ko")["urgency"] == "normal"
    assert issues.triage("난간이 헐거워요", "ko")["safety"]
    assert issues.triage("화장실이 어디예요", "ko") == {"text_ko": "화장실이 어디예요", "summary_ko": "화장실이 어디예요",
                                                   "translated": True, "urgency": "normal", "safety": False}
    assert issues._parse('<x>{"ko": "균열", "urgency": "urgent"}</x>')["ko"] == "균열"
    assert issues._parse("모르겠음") is None
