"""KOSHA 포털 자료 상세(medSeq)에서 화면 안에서 재생할 수 있는 영상 주소를 찾는다.

포털 상세 페이지는 Vue 앱이라 HTML 에 영상이 없고, 다음 API 로 그린다 (2026-11-21 PC 에서 확인).
  1) POST /api/portal24/bizV/p/VCPDG01007/selectMediaList {"medSeq"} → ytbUrlAddr(유튜브, 있으면 iframe), contsAtcflNo(첨부)
  2) POST /api/portal24/bizA/p/files/getFileList {"fileId": contsAtcflNo, ...} → 첨부별 mimeType·atcflSeq
  3) GET  /api/compn24/file/v1/a/cm/zz/mediaStream/getVideoStreamUrl/{atcflNo}/{seq} → {urlpath, fileName, orgnlAtchFileNm}
     → /api/compn24/file/v1/a/cm/zz/mediaStream/{urlpath}/{fileName}/{orgnlAtchFileNm}  (video/mp4, Range 지원, ACAO *)
포털 페이지 자체는 X-Frame-Options sameorigin 이라 iframe 으로는 못 띄운다. 응답 구조가 바뀌어도 버티도록 키를 재귀로 찾는다.
"""
from __future__ import annotations

import logging
import re
import time
from urllib.parse import parse_qs, urlparse

import httpx

log = logging.getLogger(__name__)

BASE = "https://portal.kosha.or.kr"
HEADERS = {"chnlId": "portal24", "Content-Type": "application/json", "Referer": BASE + "/"}
TTL = 600  # 스트림 토큰 만료 시점을 몰라 10분만 기억한다 (재생은 /api/kosha/video 가 그때 주소를 받아 넘긴다)
_cache: dict[str, tuple[float, dict | None]] = {}


def med_seq(url: str) -> str | None:
    v = parse_qs(urlparse(url).query).get("medSeq", [""])[0]
    return v if v.isdigit() else None


def _find(obj, key: str):
    """JSON 어디에 있든 key 의 첫 값(비어 있지 않은 것)."""
    if isinstance(obj, dict):
        if obj.get(key):
            return obj[key]
        obj = list(obj.values())
    if isinstance(obj, list):
        for o in obj:
            v = _find(o, key)
            if v:
                return v
    return None


def _dicts(obj) -> list[dict]:
    if isinstance(obj, dict):
        return [obj] + [d for v in obj.values() for d in _dicts(v)]
    if isinstance(obj, list):
        return [d for o in obj for d in _dicts(o)]
    return []


def youtube_embed(url: str) -> str | None:
    m = re.search(r"(?:youtu\.be/|v=|embed/|shorts/)([\w-]{11})", url or "")
    return f"https://www.youtube.com/embed/{m.group(1)}" if m else None


def _post(client: httpx.Client, path: str, body: dict):
    r = client.post(BASE + path, json=body, headers=HEADERS)
    r.raise_for_status()
    return r.json()


def _resolve(client: httpx.Client, seq: str) -> dict | None:
    main = _post(client, "/api/portal24/bizV/p/VCPDG01007/selectMediaList", {"medSeq": seq})
    yt = youtube_embed(str(_find(main, "ytbUrlAddr") or ""))
    if yt:
        return {"kind": "youtube", "src": yt}
    atcfl = _find(main, "contsAtcflNo") or _find(
        _post(client, "/api/portal24/bizV/p/VCPDG01007/selectAtchList", {"medSeq": seq}), "contsAtcflNo")
    if not atcfl:
        return None
    files = _post(client, "/api/portal24/bizA/p/files/getFileList",
                  {"fileId": atcfl, "atcflTaskColNm": "lastFile", "atcflSeTaskComCdNm": "Y",
                   "fileUploadType": "02", "isDirect": "N"})
    video = next((d for d in _dicts(files) if str(d.get("mimeType", "")).startswith("video/")), None)
    if not video:  # PDF 등은 영상이 아니다
        return None
    r = client.get(f"{BASE}/api/compn24/file/v1/a/cm/zz/mediaStream/getVideoStreamUrl/{atcfl}/{video.get('atcflSeq', 1)}",
                   headers=HEADERS)
    r.raise_for_status()
    parts = [_find(r.json(), k) for k in ("urlpath", "fileName", "orgnlAtchFileNm")]
    if not all(parts):
        return None
    return {"kind": "mp4", "src": f"{BASE}/api/compn24/file/v1/a/cm/zz/mediaStream/" + "/".join(map(str, parts))}


def playable(url: str, client: httpx.Client | None = None) -> dict | None:
    """{"kind": "youtube"|"mp4", "src"} 또는 None(영상 없음·실패)."""
    seq = med_seq(url)
    if not seq:
        return None
    hit = _cache.get(seq)
    if hit and time.time() - hit[0] < TTL:
        return hit[1]
    try:
        with (client or httpx.Client(timeout=8)) as c:
            got = _resolve(c, seq)
    except Exception as e:  # 포털 장애는 화면을 막지 않는다
        log.warning("KOSHA 영상 주소 조회 실패 medSeq=%s: %s", seq, e)
        return None  # 실패는 기억하지 않는다
    _cache[seq] = (time.time(), got)
    return got
