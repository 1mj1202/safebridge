"""근거 조문 조회 — 팀 요약본(data/law.json). 법제처 Open API 키가 있으면 원문 링크를 붙인다."""
from urllib.parse import quote

from app.core.config import get_settings

from .data_store import load_json


def get(article_id: str) -> dict | None:
    for a in load_json("law.json")["articles"]:
        if a["id"] == article_id:
            out = dict(a)
            out["url"] = "https://www.law.go.kr/법령/" + quote(a["law"]) + "/" + quote(a["article"])
            out["source"] = "법제처 원문 링크" if get_settings().law_api_oc else "팀 요약(원문 대조 필요)"
            return out
    return None


def find(ids: list[str]) -> list[dict]:
    return [a for i in dict.fromkeys(ids) if (a := get(i))]
