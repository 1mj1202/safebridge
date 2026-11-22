"""근로자 현장 챗봇 — 구역 선택 → 브리핑 → 질문 → 이슈(긴급도·전달) → 관리자 회신."""
import pytest

from app.services import field_chat, glossary, issues, translate


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
    assert safety and [s["rank"] for s in safety] == list(range(1, len(safety) + 1))  # 구역 안 순위
    assert any(s["measure"] for s in safety)  # 위험 바로 밑 대책
    assert not b["sections"][1]["lines"]  # 따로 있던 작업 순서 줄은 위험 밑으로 합침
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


def test_worker_names_follow_language(client, tbm):
    z = client.get(f"/api/w/{tbm['token']}/zones", params={"lang": "vi"}).json()
    row = next(r for r in z["zones"] if r["zone"] == "A동 3F-a")
    assert row["label"] == "Tòa A 3F-a" and "Tổ cốp pha" in row["teams"]
    b = client.get(f"/api/w/{tbm['token']}/brief", params={"zone": "A동 3F-a", "lang": "th"}).json()
    assert "อาคาร A" in b["title"] and not translate.looks_korean(b["teams"][0]["lead"])
    r = client.post(f"/api/w/{tbm['token']}/issue", json={"lang": "vi", "zone": "A동 3F-a", "text": "x"}).json()
    assert "Tổ trưởng" in r["messages"][-1] and r["route"][0] == "형틀팀 반장"  # 관리자 쪽은 한국어 그대로


class _KoreanAnswer:
    name = "fake"

    def __init__(self): self.calls = []

    def complete(self, system, prompt):
        self.calls.append(prompt)
        return "안전대를 착용하세요" if len(self.calls) == 1 else "Hãy đeo dây đai an toàn"


def test_chat_retranslates_korean_answer(monkeypatch):
    fake = _KoreanAnswer()
    monkeypatch.setattr(field_chat, "get_provider", lambda: fake)
    monkeypatch.setattr(translate, "get_provider", lambda: fake)
    r = field_chat.answer("Tôi phải đeo gì?", "vi", "위험: 추락")
    assert r == {"text": "Hãy đeo dây đai an toàn", "grounded": True} and len(fake.calls) == 2
    assert translate.looks_korean("안전대를 착용하세요") and not translate.looks_korean("A동 3F-a: Hãy đeo dây đai")


def test_chat_korean_worker_gets_korean_rule(monkeypatch):
    seen = []

    class _Fake:
        name = "fake"

        def complete(self, system, prompt):
            seen.append(system)
            return "안전대를 단부 지지점에 거세요"

    monkeypatch.setattr(field_chat, "get_provider", lambda: _Fake())
    r = field_chat.answer("안전대 어디에 걸어?", "ko", "위험: 추락")
    assert r == {"text": "안전대를 단부 지지점에 거세요", "grounded": True}
    assert "never in Korean" not in seen[0] and "never in Korean" in field_chat.system_prompt("vi")


def test_scene_for_zone(client, tbm):
    s = client.get(f"/api/w/{tbm['token']}/scene", params={"zone": "A동 3F-a"}).json()
    assert s["focus"]["min"][0] == 0.0 and s["focus"]["max"][0] == 15.0 and s["focus"]["min"][2] > 9
    assert s["zones"] and all(z["storey"] == "3F" for z in s["zones"]) and s["element_status"]["SLB-3F"] == "active"
    g = client.get(f"/api/w/{tbm['token']}/scene", params={"zone": "A동 외곽 지상"}).json()
    assert g["focus"]["max"][2] < 1 and all("-GROUND-" in z["id"] for z in g["zones"])
    below = client.get(f"/api/w/{tbm['token']}/scene", params={"zone": "A동 2F-a"}).json()
    assert below["zones"] and all(z["kind"] == "drop" for z in below["zones"])
