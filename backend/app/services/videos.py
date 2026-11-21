"""예방 영상 — 브리핑 속 BIM 재현(화면에서 3D 로 재생) + 안전보건공단(KOSHA) 영상 (초안 v5 9번).

KOSHA 링크는 공공데이터포털 '한국산업안전보건공단_안전보건자료 링크 서비스'
(apis.data.go.kr/B552468/selectMediaList01/getselectMediaList01, SAFEBRIDGE_KOSHA_SERVICE_KEY) 에서 받아
제목(MED_SJ_NM)으로 위험 유형을 고른다. 응답: body.items.item[] = {MED_SJ_NM, MED_URL, MED_COMPY_DY} (2026-11-21 실호출 확인).
최신순이라 위험 유형별 자료가 드물어 여러 쪽을 받아 둔다.
링크는 포털 상세 페이지(새 창, 영상이 바로 안 보임)라, 실제 영상(mp4·유튜브)이 있는 자료만 골라 화면 안에서 재생하게 준다
(kosha_media). 영상이 하나도 없으면 빈 목록 — 볼 수 없는 링크는 보여 주지 않는다.
"""
from __future__ import annotations

import logging
import time
from concurrent.futures import ThreadPoolExecutor

import httpx

from app.core.config import get_settings

from . import kosha_media

log = logging.getLogger(__name__)

URL = "https://apis.data.go.kr/B552468/selectMediaList01/getselectMediaList01"
PAGES, ROWS = 3, 1000
WORDS = {"fall_edge": ("추락", "떨어짐", "안전난간", "단부", "비계", "발판"), "fall_opening": ("추락", "개구부", "떨어짐"),
         "falling_object": ("낙하", "비래", "낙하물", "양중"), "collapse": ("붕괴", "무너짐", "거푸집", "동바리"),
         "caught": ("끼임", "협착")}
# 제목에 위험 단어가 있어도 건설 현장과 먼 자료 (2026-11-21 2F 에 철도 스패너·탁상 연삭기가 섞여 나옴)
OFF = ("철도", "연삭", "선반", "프레스", "농작업", "농기계", "어선", "선박", "축산", "식품", "급식", "화학", "사무실")
VIDEOISH = ("영상", "CCTV", "애니", "실제상황", "드라마", "사고사례")
LOOKUPS = 20  # 영상 여부 확인은 후보 몇 개까지만 (포털 호출이 자료마다 3~4번)
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
    if row.get("MED_URL") and row.get("MED_SJ_NM"):
        return {"title": str(row["MED_SJ_NM"]).strip(), "url": str(row["MED_URL"]), "source": "kosha"}
    url = next((str(v) for v in row.values() if isinstance(v, str) and v.startswith("http")), "")
    title = next((str(row[k]) for k in row if "titl" in k.lower() or "nm" in k.lower() or "제목" in k), "")
    return {"title": title.strip(), "url": url, "source": "kosha"} if url and title else None


def _fetch(key: str) -> list[dict]:
    if "all" in _cache and time.time() - _cache["all"][0] < TTL:
        return _cache["all"][1]
    rows: list[dict] = []
    for page in range(1, PAGES + 1):
        params = {"serviceKey": key, "callApiId": "1030", "pageNo": page, "numOfRows": ROWS, "ctgr04_kr": "Y",
                  "returnType": "json"}
        r = httpx.get(URL, params=params, timeout=10)
        r.raise_for_status()
        got = [p for p in (_pick(x) for x in _rows(r.json())) if p]
        rows += got
        if len(got) < ROWS:
            break
    _cache["all"] = (time.time(), rows)
    return rows


def candidates(rows: list[dict], hazard_keys: list[str]) -> list[dict]:
    words = [w for k in hazard_keys for w in WORDS.get(k, ())]
    hits, seen = [], set()
    for r in rows:
        t = r["title"]
        if r["url"] not in seen and any(w in t for w in words) and not any(o in t for o in OFF):
            seen.add(r["url"])
            hits.append(r)
    return sorted(hits, key=lambda r: not any(m in r["title"] for m in VIDEOISH))  # 영상일 법한 제목 먼저


def kosha_links(hazard_keys: list[str], limit: int = 3) -> list[dict]:
    """화면 안에서 재생할 KOSHA 영상: [{title, url(포털 상세), source, kind: mp4|youtube, src}]."""
    key = get_settings().kosha_service_key
    if not key:
        return []
    try:
        rows = _fetch(key)
    except Exception as e:  # 외부 API 실패는 화면을 막지 않는다
        log.warning("KOSHA 자료 링크 조회 실패: %s", e)
        return []
    cands = candidates(rows, hazard_keys)[:LOOKUPS]
    with ThreadPoolExecutor(max_workers=6) as ex:  # 자료마다 포털 호출 3~4번이라 함께 묻는다
        found = list(ex.map(lambda r: kosha_media.playable(r["url"]), cands))
    out = []
    for r, p in zip(cands, found):
        if p:
            src = p["src"] if p["kind"] == "youtube" else f"/api/kosha/video/{kosha_media.med_seq(r['url'])}"
            out.append({**r, "kind": p["kind"], "src": src})
            if len(out) >= limit:
                break
    return out
