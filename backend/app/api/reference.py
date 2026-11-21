"""근거 조회 API — 사고사례·조문·재해 패턴·메타."""
from fastapi import APIRouter, HTTPException

from app.core.clock import today
from app.core.config import get_settings
from app.llm.factory import get_provider
from app.services import glossary, guides, law, patterns, risk_profile, site

router = APIRouter(prefix="/api", tags=["reference"])


@router.get("/meta")
def meta():
    return {"today": today().isoformat(), "provider": get_provider().name,
            "langs": glossary.lang_names(), "public_web_url": get_settings().public_web_url,
            "site": f"{site.info()['site']} · {site.info()['building']}"}


@router.get("/accidents/{case_id}")
def accident(case_id: str):
    c = patterns.get_case(case_id)
    if not c:
        raise HTTPException(404, "사고사례 없음")
    return c


@router.get("/patterns/{trade}")
def pattern(trade: str):
    return patterns.pattern(trade)


@router.get("/guides/{guide_id}")
def guide(guide_id: str):
    g = guides.get(guide_id)
    if not g:
        raise HTTPException(404, "지침 없음")
    return g


@router.get("/profile/{profile_id}")
def profile(profile_id: str):
    r = risk_profile.by_id(profile_id)
    if not r:
        raise HTTPException(404, "위험요소 프로파일 없음")
    return {**r, "source": risk_profile.source()}


@router.get("/law/{article_id}")
def law_article(article_id: str):
    a = law.get(article_id)
    if not a:
        raise HTTPException(404, "조문 없음")
    return a


@router.get("/glossary")
def glossary_terms():
    return {"terms": glossary.terms()}
