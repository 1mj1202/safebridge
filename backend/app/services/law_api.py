"""법제처 국가법령정보 Open API — 「산업안전보건기준에 관한 규칙」 현행 조문 원문 조회.

신청: https://open.law.go.kr  (OPEN API 신청 → 법령 본문. OC 는 가입 이메일의 @ 앞부분, 서버 IP 등록 필요)
SAFEBRIDGE_LAW_API_OC 에 OC 를 넣으면 쓴다. 없거나 실패하면 None 을 돌려주고, 부르는 쪽(law.py)이 팀 요약으로 대체한다.

- 받은 원문은 var/law_cache.json 에 7일 보관. 기한이 지나도 새로 받기 실패하면 옛 원문을 그대로 쓴다(시연 중 인터넷 끊김 대비).
- 호출 실패 뒤 5분 동안은 다시 부르지 않는다(화면이 매번 3초씩 기다리지 않게).
"""
from __future__ import annotations

import json
import logging
import re
import threading
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import httpx

from app.core.config import BACKEND_DIR, get_settings

log = logging.getLogger(__name__)

SEARCH_URL = "https://www.law.go.kr/DRF/lawSearch.do"
SERVICE_URL = "https://www.law.go.kr/DRF/lawService.do"
TIMEOUT = 3.0
TTL = 7 * 24 * 3600
RETRY_AFTER = 300

_lock = threading.Lock()
_mem: dict | None = None
_down_until = 0.0
_mst: dict[str, str] = {}
_last_error = ""


class LawApiError(RuntimeError):
    pass


def cache_path() -> Path:
    return BACKEND_DIR / "var" / "law_cache.json"


def _load() -> dict:
    global _mem
    if _mem is None:
        try:
            _mem = json.loads(cache_path().read_text(encoding="utf-8"))
        except (OSError, ValueError):
            _mem = {}
    return _mem


def _save() -> None:
    p = cache_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(".tmp")
    tmp.write_text(json.dumps(_load(), ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(p)


def jo_code(article: str) -> str:
    """'제42조' → '004200', '제42조의2' → '004202' (법제처 JO 형식: 조 4자리 + 가지 2자리)."""
    m = re.match(r"제(\d+)조(?:의(\d+))?", article.strip())
    if not m:
        raise ValueError(f"조문 번호를 읽을 수 없음: {article}")
    return f"{int(m.group(1)):04d}{int(m.group(2) or 0):02d}"


def _as_list(v) -> list:
    if v is None:
        return []
    return v if isinstance(v, list) else [v]


def _text(v) -> list[str]:
    """법제처 JSON 의 내용 칸은 문자열이거나 문자열 목록(여러 줄)이다."""
    out = []
    for x in _as_list(v):
        if isinstance(x, list):
            out += _text(x)
        elif isinstance(x, str) and x.strip():
            out.append(x.strip())
    return out


def article_text(unit: dict) -> str:
    """조문단위 하나를 사람이 읽는 원문으로 (조 → 항 → 호 → 목)."""
    lines = _text(unit.get("조문내용"))
    for hang in _as_list(unit.get("항")):
        lines += _text(hang.get("항내용"))
        for ho in _as_list(hang.get("호")):
            lines += ["  " + t for t in _text(ho.get("호내용"))]
            for mok in _as_list(ho.get("목")):
                lines += ["    " + t for t in _text(mok.get("목내용"))]
    return "\n".join(lines)


def pick_unit(body: dict, jo: str) -> dict:
    units = _as_list(((body.get("법령") or {}).get("조문") or {}).get("조문단위"))
    num, branch = str(int(jo[:4])), int(jo[4:])
    for u in units:
        if u.get("조문여부", "조문") != "조문":
            continue
        if str(u.get("조문번호", "")).strip() == num and int(u.get("조문가지번호") or 0) == branch:
            return u
    raise LawApiError(f"응답에 조문 없음: JO={jo}")


def _get(url: str, params: dict) -> dict:
    r = httpx.get(url, params=params, timeout=TIMEOUT)
    r.raise_for_status()
    try:
        body = r.json()
    except ValueError as e:
        raise LawApiError("JSON 아닌 응답") from e
    if "result" in body and len(body) <= 2:  # 키·IP 검증 실패 등: {"result": "...", "msg": "..."}
        raise LawApiError(f"{body.get('result')} {body.get('msg', '')}".strip())
    return body


def _law_mst(oc: str, law_name: str) -> str:
    if law_name in _mst:
        return _mst[law_name]
    body = _get(SEARCH_URL, {"OC": oc, "target": "law", "type": "JSON", "query": law_name, "display": 20})
    for row in _as_list((body.get("LawSearch") or {}).get("law")):
        if (row.get("법령명한글") or "").strip() == law_name:
            _mst[law_name] = str(row["법령일련번호"])
            return _mst[law_name]
    raise LawApiError(f"법령 검색 결과 없음: {law_name}")


def fetch(oc: str, law_name: str, article: str) -> dict:
    """원격 조회 한 번 (캐시 안 씀). 실패하면 예외."""
    jo = jo_code(article)
    mst = _law_mst(oc, law_name)
    body = _get(SERVICE_URL, {"OC": oc, "target": "law", "type": "JSON", "MST": mst, "JO": jo})
    text = article_text(pick_unit(body, jo))
    if not text:
        raise LawApiError(f"조문 내용이 비어 있음: {article}")
    eff = str(((body.get("법령") or {}).get("기본정보") or {}).get("시행일자") or "")
    if re.fullmatch(r"\d{8}", eff):
        eff = f"{eff[:4]}-{eff[4:6]}-{eff[6:]}"
    return {"text": text, "effective": eff, "mst": mst,
            "fetched": datetime.now(ZoneInfo("Asia/Seoul")).strftime("%Y-%m-%d"), "ts": time.time()}


def original(law_name: str, article: str) -> dict | None:
    """원문 {text, effective, mst, fetched} 또는 None(키 없음·실패·캐시도 없음)."""
    global _down_until, _last_error
    key = f"{law_name}|{article}"
    with _lock:
        hit = _load().get(key)
    if hit and time.time() - hit.get("ts", 0) < TTL:
        return hit
    oc = get_settings().law_api_oc.strip()
    if not oc or time.time() < _down_until:
        return hit
    try:
        got = fetch(oc, law_name, article)
    except (httpx.HTTPError, LawApiError, ValueError, KeyError, TypeError) as e:
        log.warning("법제처 조회 실패(%s %s): %s — 팀 요약/보관 원문으로 대체", law_name, article, e)
        _down_until = time.time() + RETRY_AFTER
        _last_error = str(e)
        return hit
    _last_error = ""
    with _lock:
        _load()[key] = got
        _save()
    return got


def prefetch(articles: list[dict]) -> None:
    """서버 시작 때 뒤에서 미리 받아 둔다. 키가 없으면 아무것도 안 한다."""
    if not get_settings().law_api_oc.strip():
        return

    def run():
        n = sum(1 for a in articles if original(a["law"], a["article"]))
        log.info("법제처 원문 미리 받기: %d/%d", n, len(articles))

    threading.Thread(target=run, name="law-prefetch", daemon=True).start()


def status(probe: dict | None = None) -> dict:
    """연결 점검용 (키 값은 내보내지 않는다). probe={law, article} 이면 캐시를 건너뛰고 실제로 한 번 불러 본다."""
    out = {"key_set": bool(get_settings().law_api_oc.strip()), "cached": len(_load()),
           "last_error": _last_error, "retry_wait_s": max(0, round(_down_until - time.time()))}
    if probe and out["key_set"]:
        try:
            got = fetch(get_settings().law_api_oc.strip(), probe["law"], probe["article"])
            out["probe"] = {"ok": True, "article": probe["article"], "effective": got["effective"],
                            "head": got["text"][:80]}
        except (httpx.HTTPError, LawApiError, ValueError, KeyError, TypeError) as e:
            out["probe"] = {"ok": False, "error": str(e)}
    return out


def reset_for_tests() -> None:
    global _mem, _down_until, _last_error
    _mem, _down_until, _last_error = None, 0.0, ""
    _mst.clear()
