"""구역 브리핑의 '해야 할 행동' 정리 (사용자 결정 2026-11-22, 반복 줄이기).

위험 카드 + 확인 체크리스트를 하나로 합친다:
- 위험마다 행동 카드 한 장: 위험 이름 | 시점(when.<위험>), 행동(act.<위험>) — 승인된 대책(build.<위험>)과 같은 대상·행동·조건.
- 카드 행동이 이미 말하는 확인 항목은 다시 쓰지 않는다(COVERS).
- 카드에 없는 보호구(안전대·안전모)는 '공통 보호구' 한 줄로. 나머지 확인 항목은 그 위험 카드 밑에 덧붙인다.
- 관리자 한마디가 이미 나온 안내만 되풀이하면 숨기고, 새 장소·시간·작업 제한이 있으면 보여 준다.
문장은 모두 문장 은행(phrases.json)에서 고른다.
"""
from __future__ import annotations

import re

from . import glossary

# 카드 행동이 이미 말하는 확인 항목 (같은 대상·행동·조건)
COVERS = {
    "fall_edge": {"check.guardrail"},
    "fall_opening": {"check.opening_cover"},
    "collapse": {"check.shoring"},
    "falling_object": {"check.no_entry_below"},
    "caught": set(),
}
PPE = {"check.harness": "ppe.harness", "check.helmet": "ppe.helmet"}

# 관리자 한마디가 되풀이인지 볼 때 쓰는 낱말 (확인 항목 → 한국어 낱말)
WORDS = {
    "check.harness": ("안전대",), "check.helmet": ("안전모", "턱끈"), "check.guardrail": ("안전난간", "난간"),
    "check.opening_cover": ("개구부", "덮개"), "check.shoring": ("동바리", "버팀대"),
    "check.signal": ("신호수",), "check.tool_tether": ("공구",), "check.no_entry_below": ("아래층",),
}
# 새 장소·시간·작업 제한을 담은 한마디는 항상 보여 준다
NEW_LIMIT = re.compile(r"\d+\s*(시|분|층)|(작업|시작|운반|인양|타설|양중)\s*(전|후|중)|오전|오후|까지|부터|이후|이전|금지|중지|중단|통제|제한|대기|출입|[A-Z]동|\dF")


def has(key: str) -> bool:
    return key in glossary.load_json("phrases.json")["phrases"]


def actions(items: list[dict], lang: str, restricted: bool) -> tuple[list[dict], list[str], set[str]]:
    """(행동 카드, 공통 보호구, 화면에 나온 확인 항목). 출입 통제 구역은 카드 대신 맨 위 출입금지 배너가 지시한다."""
    cards, ppe, shown = [], [], set()
    if restricted:
        return cards, ppe, shown
    covered = set().union(*(COVERS.get(it["key"], set()) for it in items if has(f"act.{it['key']}")))
    for it in items:
        k = it["key"]
        extra = [c for c in it.get("checks", []) if c not in covered and c not in PPE and c not in shown]
        shown |= set(extra) | (COVERS.get(k, set()) if has(f"act.{k}") else set())
        cards.append({
            "item_id": it["id"], "level": it["level"], "hazard": glossary.phrase(f"hazard.{k}", lang),
            "when": glossary.phrase(f"when.{k}", lang) if has(f"when.{k}") else None,
            "do": glossary.phrase(f"act.{k}", lang) if has(f"act.{k}") else glossary.phrase(f"build.{k}", lang) if has(f"build.{k}") else None,
            "extra": [glossary.phrase(c, lang) for c in extra],
        })
    for it in items:
        for c in it.get("checks", []):
            if c in PPE and c not in shown:
                shown.add(c)
                ppe.append(glossary.phrase(PPE[c], lang))
    return cards, ppe, shown


def memo_repeats(memo_ko: str, shown: set[str]) -> bool:
    """관리자 한마디(승인 원문)가 화면에 이미 나온 안내만 되풀이하는지 — 새 제한이 있거나 모르는 내용이면 False"""
    if not memo_ko.strip() or NEW_LIMIT.search(memo_ko):
        return False
    hits = {c for c, ws in WORDS.items() if any(w in memo_ko for w in ws)}
    return bool(hits) and hits <= shown
