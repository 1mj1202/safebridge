from app.agent.explain_clean import clean_draft, strip_refs


def test_drops_law_and_case_sentences():
    t = ("3F 슬래브 외곽 단부(남·북·서·동측)에서 추락 위험이 있으며 이는 LAW-42 및 LAW-13에 근거합니다. "
         "사례 SIF-0479 및 SIF-0502에서 유사한 사고가 발생했습니다.")
    assert strip_refs(t) == "3F 슬래브 외곽 단부(남·북·서·동측)에서 추락 위험이 있습니다."


def test_keeps_text_without_refs_and_other_sentences():
    assert strip_refs("개구부 추락 위험이 있습니다.") == "개구부 추락 위험이 있습니다."
    t = "개구부 추락 위험이 있습니다. 과거 유사 사례 SIF-0317, CSI-0002에서도 같은 유형이 있었습니다."
    assert strip_refs(t) == "개구부 추락 위험이 있습니다."


def test_never_empties_explanation():
    t = "SIF-0001 사례와 같은 낙하 위험."
    assert strip_refs(t) == t


def test_clean_draft_copies():
    d = {"items": [{"explanation": "위험이 있습니다. 근거는 LAW-43입니다."}]}
    out = clean_draft(d)
    assert out["items"][0]["explanation"] == "위험이 있습니다."
    assert d["items"][0]["explanation"].endswith("LAW-43입니다.")
