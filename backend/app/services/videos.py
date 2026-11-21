"""예방 영상 — 브리핑 속 BIM 재현(화면에서 3D 로 재생) + 안전보건공단(KOSHA) 안전보건자료 링크 (초안 v5 9번).

KOSHA 링크는 공공데이터포털 '한국산업안전보건공단_안전보건자료 링크 서비스'
(apis.data.go.kr/B552468/selectMediaList01, SAFEBRIDGE_KOSHA_SERVICE_KEY) 에서 받아 제목으로 위험 유형을 고른다.
응답 항목 이름이 문서에 없어 제목·주소처럼 보이는 값을 찾아 쓴다(인증키로 실제 응답을 확인하기 전까지 시험 기능).
키가 없거나 실패하면 KOSHA 누리집 링크 하나만 준다.
"""
from __future__ import annotations

import logging
import time

import httpx

from app.core.config import get_settings

log = logging.getLogger(__name__)

URL = "https://apis.data.go.kr/B552468/selectMediaList01"
HOME = {"title": "KOSHA 안전보건공단", "url": "https://www.kosha.or.kr", "source": "kosha"}
WORDS = {"fall_edge": ("추락", "떨어짐"), "fall_opening": ("추락", "개구부", "떨어짐"),
         "falling_object": ("낙하", "비래", "맞음"), "collapse": ("붕괴", "무너짐", "거푸집", "동바리"),
         "caught": ("끼임", "협착")}
TTL = 6 * 3600
_cache: dict[str, tuple[float, list[dict]]] = {}


def _rows(obj) -> list[dict]:
    """응답 JSON 어디에 있든 항목(dict) 목록을 찾는다."""
    if isinstance(obj, list):
        return [o for o in obj if isinstance(o, dict)]
    if isinstance(obj, dict):
        for k in ("item", "items", "body", "response", "data"):
            if k in obj:
                r = _rows(obj[k])
                if r:
                    return r
    return []


def _pick(row: dict) -> dict | None:
    url = next((str(v) for v in row.values() if isinstance(v, str) and v.startswith("http")), "")
    title = next((str(row[k]) for k in row if "titl" in k.lower() or "nm" in k.lower() or "제목" in k), "")
    return {"title": title.strip(), "url": url, "source": "kosha"} if url and title else None


def _fetch(key: str) -> list[dict]:
    if "all" in _cache and time.time() - _cache["all"][0] < TTL:
        return _cache["all"][1]
    params = {"serviceKey": key, "callApiId": "1030", "pageNo": 1, "numOfRows": 200, "ctgr04_kr": "Y",
              "returnType": "json"}
    r = httpx.get(URL, params=params, timeout=8)
    r.raise_for_status()
    rows = [p for p in (_pick(x) for x in _rows(r.json())) if p]
    _cache["all"] = (time.time(), rows)
    return rows


def kosha_links(hazard_keys: list[str], limit: int = 3) -> list[dict]:
    key = get_settings().kosha_service_key
    if not key:
        return [HOME]
    try:
        rows = _fetch(key)
    except Exception as e:  # 외부 API 실패는 화면을 막지 않는다
        log.warning("KOSHA 자료 링크 조회 실패: %s", e)
        return [HOME]
    words = [w for k in hazard_keys for w in WORDS.get(k, ())]
    hits = [r for r in rows if any(w in r["title"] for w in words)]
    return (hits[:limit] or [HOME])
