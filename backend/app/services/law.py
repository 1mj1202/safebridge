"""근거 조문 조회 — 팀 요약본(data/law.json) + 법제처 Open API 원문(law_api, 키가 있을 때)."""
from urllib.parse import quote

from . import law_api
from .data_store import load_json

SUMMARY_ONLY = "팀 요약(원문 대조 필요)"


def articles() -> list[dict]:
    return load_json("law.json")["articles"]


def get(article_id: str) -> dict | None:
    for a in articles():
        if a["id"] == article_id:
            out = dict(a)
            out["url"] = "https://www.law.go.kr/법령/" + quote(a["law"]) + "/" + quote(a["article"])
            orig = law_api.original(a["law"], a["article"])
            if orig:
                out["original_text"] = orig["text"]
                out["effective_date"] = orig.get("effective", "")
                when = f"시행 {orig['effective']}, " if orig.get("effective") else ""
                out["source"] = f"법제처 원문 ({when}조회 {orig['fetched']})"
            else:
                out["original_text"] = ""
                out["source"] = SUMMARY_ONLY
            return out
    return None


def find(ids: list[str]) -> list[dict]:
    return [a for i in dict.fromkeys(ids) if (a := get(i))]


def prefetch() -> None:
    law_api.prefetch(articles())


def status(probe: bool = False, article: str = "") -> dict:
    """probe=True 면 실제 조회 한 번. article(예: '제331조')을 주면 요약본에 없는 조도 원문 대조용으로 본다."""
    a = articles()[0] if probe else None
    return law_api.status({"law": a["law"], "article": article or a["article"]} if a else None)
