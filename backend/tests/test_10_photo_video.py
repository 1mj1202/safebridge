"""사진 증빙(촬영정보 제거·얼굴 흐림·반장 확인)과 예방 영상 링크."""
import base64

import cv2
import numpy as np
import pytest

from app.services import photos, videos


def _jpeg_with_exif() -> bytes:
    img = np.full((400, 600, 3), 180, np.uint8)
    cv2.rectangle(img, (100, 100), (500, 300), (40, 90, 200), -1)
    ok, buf = cv2.imencode(".jpg", img)
    raw = buf.tobytes()
    exif = b"Exif\x00\x00" + b"MM\x00*\x00\x00\x00\x08\x00\x00" + b"GPS-SECRET-LOCATION"
    app1 = b"\xff\xe1" + (len(exif) + 2).to_bytes(2, "big") + exif
    return raw[:2] + app1 + raw[2:]  # SOI 바로 뒤에 EXIF(APP1) 끼워 넣기


@pytest.fixture(scope="module")
def tbm(client):
    a = client.post("/api/agent/assess", json={"query": "내일 3층 작업 위험 알려줘"}).json()
    client.post(f"/api/assessments/{a['id']}/approve")
    return client.post(f"/api/assessments/{a['id']}/publish", json={}).json()


def test_sanitize_removes_exif_and_resizes():
    raw = _jpeg_with_exif()
    assert b"GPS-SECRET" in raw
    out, n = photos.sanitize(raw)
    assert b"GPS-SECRET" not in out and b"Exif" not in out and n == 0
    big = cv2.imencode(".png", np.zeros((3000, 2000, 3), np.uint8))[1].tobytes()
    img = cv2.imdecode(np.frombuffer(photos.sanitize(big)[0], np.uint8), cv2.IMREAD_COLOR)
    assert max(img.shape[:2]) == photos.MAX_SIDE
    with pytest.raises(photos.PhotoError):
        photos.sanitize(b"not an image")


def test_blur_regions_changes_only_box():
    img = np.zeros((200, 200, 3), np.uint8)
    img[::2, ::2] = 255  # 촘촘한 무늬 → 흐리면 값이 고르게 된다
    before = img.copy()
    photos.blur_regions(img, [(80, 80, 40, 40)])
    assert img[100, 100].tolist() != before[100, 100].tolist() or img[101, 101].tolist() != before[101, 101].tolist()
    assert (img[:40, :40] == before[:40, :40]).all()


def test_brief_has_photo_request_and_videos(client, tbm):
    b = client.get(f"/api/w/{tbm['token']}/brief", params={"zone": "A동 3F-a", "lang": "vi"}).json()
    assert b["photo"]["key"].startswith("photo.") and b["photo"]["text"]
    assert b["videos"] == []  # 인증키 없으면 KOSHA 영상 없음 (볼 수 없는 링크는 안 보여 준다)
    r = client.get(f"/api/w/{tbm['token']}/brief", params={"zone": "A동 2F-a", "lang": "ko"}).json()
    assert r["photo"] is None  # 출입 통제 구역은 사진 요청 없음


def test_upload_list_confirm(client, tbm):
    before = client.get(f"/api/tbms/{tbm['id']}/photos").json()
    assert "A동 3F-a" in before["missing"] and "A동 2F-a" not in before["missing"]
    img = "data:image/jpeg;base64," + base64.b64encode(_jpeg_with_exif()).decode()
    r = client.post(f"/api/w/{tbm['token']}/photos",
                    json={"lang": "vi", "zone": "A동 3F-a", "request": "photo.fall_opening", "image": img})
    assert r.status_code == 200 and r.json()["message"] == "Đã gửi ảnh. Tổ trưởng sẽ kiểm tra."
    after = client.get(f"/api/tbms/{tbm['id']}/photos").json()
    p = after["photos"][0]
    assert p["zone"] == "A동 3F-a" and p["ai_status"] == "skipped" and p["status"] == "pending"
    assert p["request"] == "개구부 덮개 사진 1장" and "A동 3F-a" not in after["missing"]
    got = client.get(p["image"])
    assert got.status_code == 200 and b"GPS-SECRET" not in got.content
    assert client.post(f"/api/photos/{p['id']}/confirm").json()["status"] == "confirmed"
    bad = client.post(f"/api/w/{tbm['token']}/photos", json={"lang": "ko", "zone": "A동 3F-a", "image": "!!!!notbase64"})
    assert bad.status_code == 422


def test_kosha_rows_parsing():
    data = {"response": {"body": {"items": {"item": [
        {"titlNm": "건설현장 추락재해 예방 (베트남어)", "linkUrl": "https://example.org/v1"},
        {"titlNm": "화학물질 관리", "linkUrl": "https://example.org/v2"}, {"x": 1}]}}}}
    rows = [p for p in (videos._pick(r) for r in videos._rows(data)) if p]
    assert [r["url"] for r in rows] == ["https://example.org/v1", "https://example.org/v2"]


def test_kosha_real_format_and_match(monkeypatch):
    """2026-11-21 실호출로 확인한 응답 형식: body.items.item[] = {MED_SJ_NM, MED_URL, MED_COMPY_DY}."""
    real = {"header": {"resultCode": "00"}, "body": {"totalCount": 3, "items": {"item": [
        {"MED_URL": "https://portal.kosha.or.kr/a?medSeq=1", "MED_COMPY_DY": "2026-11-19", "MED_SJ_NM": "한랭질환 예방"},
        {"MED_URL": "https://portal.kosha.or.kr/a?medSeq=2", "MED_COMPY_DY": "2026-11-18",
         "MED_SJ_NM": "[실제상황] 위태로운 발판, 예견된 추락"},
        {"MED_URL": "https://portal.kosha.or.kr/a?medSeq=3", "MED_COMPY_DY": "2026-11-17", "MED_SJ_NM": "끼임 사고사례"}]}}}

    class R:
        def raise_for_status(self): ...
        def json(self): return real

    calls = []
    monkeypatch.setattr(videos.httpx, "get", lambda url, params, timeout: calls.append((url, params)) or R())
    monkeypatch.setattr(videos, "get_settings", lambda: type("S", (), {"kosha_service_key": "k"})())
    monkeypatch.setattr(videos.kosha_media, "playable", lambda url: {"kind": "mp4", "src": "https://x/stream"})
    videos._cache.clear()
    got = videos.kosha_links(["fall_edge", "fall_opening"])
    assert [g["url"] for g in got] == ["https://portal.kosha.or.kr/a?medSeq=2"]
    assert got[0]["kind"] == "mp4" and got[0]["src"] == "/api/kosha/video/2"
    assert calls[0][0].endswith("/selectMediaList01/getselectMediaList01") and len(calls) == 1
    assert videos.kosha_links(["collapse"]) == []  # 맞는 자료 없으면 없음
    monkeypatch.setattr(videos.kosha_media, "playable", lambda url: None)
    assert videos.kosha_links(["fall_edge"]) == []  # 영상이 아닌 자료(PDF 등)는 빼 준다
    videos._cache.clear()


def test_kosha_candidates_skip_off_site_and_prefer_video():
    rows = [{"title": "철도 스패너 떨어짐 사고", "url": "u1"}, {"title": "개구부 추락 키메시지", "url": "u2"},
            {"title": "[실제상황: 그날의 CCTV] 위태로운 발판, 예견된 추락", "url": "u3"}]
    assert [r["url"] for r in videos.candidates(rows, ["fall_edge"])] == ["u3", "u2"]
