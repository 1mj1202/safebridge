"""KOSHA 포털 상세 → 화면 안 재생 주소 (응답 모양은 2026-11-21 PC 에서 본 것)."""
from app.services import kosha_media as km


class Resp:
    def __init__(self, data): self.data = data
    def raise_for_status(self): ...
    def json(self): return self.data


class Client:
    def __init__(self, main, files=None, stream=None):
        self.main, self.files, self.stream, self.calls = main, files, stream, []
    def __enter__(self): return self
    def __exit__(self, *a): ...
    def post(self, url, json, headers):
        self.calls.append(url)
        assert headers["chnlId"] == "portal24"
        if url.endswith("/selectMediaList"):
            return Resp(self.main)
        if url.endswith("/selectAtchList"):
            return Resp({})
        return Resp(self.files)
    def get(self, url, headers):
        self.calls.append(url)
        return Resp(self.stream)


URL = "https://portal.kosha.or.kr/archive/x/master-detail2?medSeq={}"


def test_mp4_attachment_becomes_stream():
    km._cache.clear()
    c = Client({"payload": {"results": {"ytbUrlAddr": None, "contsAtcflNo": "HTR1"}}},
               {"payload": [{"atcflSeq": 1, "mimeType": "video/mp4"}]},
               {"payload": {"urlpath": "UP", "fileName": "FN", "orgnlAtchFileNm": "ON"}})
    got = km.playable(URL.format(52906), client=c)
    assert got == {"kind": "mp4", "src": km.BASE + "/api/compn24/file/v1/a/cm/zz/mediaStream/UP/FN/ON"}
    assert c.calls[-1].endswith("/getVideoStreamUrl/HTR1/1")
    km._cache.clear()


def test_pdf_is_not_video_and_youtube_is_embedded():
    km._cache.clear()
    pdf = Client({"results": {"contsAtcflNo": "HTR2"}}, {"list": [{"atcflSeq": 1, "mimeType": "application/pdf"}]})
    assert km.playable(URL.format(52897), client=pdf) is None
    yt = Client({"results": {"ytbUrlAddr": "https://www.youtube.com/watch?v=abcdefghijk"}})
    assert km.playable(URL.format(1), client=yt) == {"kind": "youtube", "src": "https://www.youtube.com/embed/abcdefghijk"}
    assert km.playable("https://www.kosha.or.kr") is None
    km._cache.clear()


def test_portal_failure_is_quiet():
    km._cache.clear()

    class Bad(Client):
        def post(self, *a, **k): raise RuntimeError("down")

    assert km.playable(URL.format(5), client=Bad({})) is None and "5" not in km._cache


def test_video_redirect(client, monkeypatch):
    monkeypatch.setattr(km, "playable", lambda url: {"kind": "mp4", "src": "https://portal.kosha.or.kr/s"} if "medSeq=7" in url else None)
    r = client.get("/api/kosha/video/7", follow_redirects=False)
    assert r.status_code == 302 and r.headers["location"] == "https://portal.kosha.or.kr/s"
    assert client.get("/api/kosha/video/8", follow_redirects=False).status_code == 404
