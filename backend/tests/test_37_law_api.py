"""법제처 Open API 원문 조회 — 성공·실패 대체·캐시 (네트워크 없이 응답을 흉내 낸다)."""
import httpx
import pytest

from app.core.config import get_settings
from app.services import law, law_api

LAW = "산업안전보건기준에 관한 규칙"

SEARCH = {"LawSearch": {"law": [{"법령명한글": "산업안전보건기준에 관한 규칙 별표", "법령일련번호": "1"},
                                {"법령명한글": LAW, "법령일련번호": "270000"}]}}
SERVICE = {"법령": {"기본정보": {"시행일자": "20260101"}, "조문": {"조문단위": [
    {"조문번호": "42", "조문여부": "전문", "조문내용": "제2장 작업장"},
    {"조문번호": "42", "조문여부": "조문", "조문제목": "추락의 방지", "조문내용": "제42조(추락의 방지)",
     "항": [{"항내용": "① 사업주는 추락 위험 장소에 안전난간을 설치해야 한다.",
            "호": [{"호내용": "1. 작업발판 끝", "목": {"목내용": [["가. 개구부"]]}}]},
           {"항내용": "② 곤란하면 안전대를 착용하게 해야 한다."}]},
]}}}


class Resp:
    def __init__(self, body):
        self.body = body

    def raise_for_status(self):
        pass

    def json(self):
        return self.body


@pytest.fixture
def api(monkeypatch, tmp_path):
    calls = []

    def fake_get(url, params, timeout):
        calls.append((url, params))
        return Resp(SEARCH if url == law_api.SEARCH_URL else SERVICE)

    monkeypatch.setattr(law_api, "cache_path", lambda: tmp_path / "law_cache.json")
    monkeypatch.setattr(law_api.httpx, "get", fake_get)
    monkeypatch.setattr(get_settings(), "law_api_oc", "tester")
    law_api.reset_for_tests()
    yield calls
    law_api.reset_for_tests()


def test_jo_code():
    assert law_api.jo_code("제42조") == "004200"
    assert law_api.jo_code("제334조") == "033400"
    assert law_api.jo_code("제42조의2") == "004202"


def test_original_text_from_api(api):
    a = law.get("LAW-42")
    assert a["original_text"].startswith("제42조(추락의 방지)\n① 사업주는")
    assert "  1. 작업발판 끝" in a["original_text"] and "    가. 개구부" in a["original_text"]
    assert "제2장" not in a["original_text"]
    assert a["source"].startswith("법제처 원문 (시행 2026-01-01, 조회 ")
    assert a["summary"]  # 팀 요약도 그대로 둔다
    service = [p for u, p in api if u == law_api.SERVICE_URL][0]
    assert service["MST"] == "270000" and service["JO"] == "004200" and service["OC"] == "tester"


def test_cache_file_reused(api, tmp_path):
    law.get("LAW-42")
    n = len(api)
    law_api.reset_for_tests()  # 서버 재시작처럼 메모리를 비워도 파일에서 읽는다
    assert law.get("LAW-42")["original_text"]
    assert len(api) == n and (tmp_path / "law_cache.json").exists()


def test_fallback_on_key_error(monkeypatch, api):
    monkeypatch.setattr(law_api.httpx, "get", lambda *a, **k: Resp({"result": "사용자 정보 검증에 실패하였습니다.", "msg": "IP 등록"}))
    a = law.get("LAW-42")
    assert a["original_text"] == "" and a["source"] == law.SUMMARY_ONLY and a["summary"]


def test_fallback_on_timeout_then_backoff(monkeypatch, api):
    hits = []

    def boom(*a, **k):
        hits.append(1)
        raise httpx.ConnectTimeout("timeout")

    monkeypatch.setattr(law_api.httpx, "get", boom)
    assert law.get("LAW-42")["source"] == law.SUMMARY_ONLY
    assert law.get("LAW-13")["source"] == law.SUMMARY_ONLY
    assert len(hits) == 1  # 실패 뒤 잠시 다시 부르지 않는다


def test_stale_cache_used_when_offline(monkeypatch, api):
    law.get("LAW-42")
    key = f"{LAW}|제42조"
    law_api._load()[key]["ts"] = 0  # 기한 지남
    monkeypatch.setattr(law_api.httpx, "get", lambda *a, **k: (_ for _ in ()).throw(httpx.ConnectError("off")))
    assert law.get("LAW-42")["original_text"].startswith("제42조")


def test_no_key_no_call(monkeypatch, api):
    monkeypatch.setattr(get_settings(), "law_api_oc", "")
    assert law.get("LAW-42")["source"] == law.SUMMARY_ONLY
    assert api == []
