"""역번역 뜻 검사 보완: 그 나라 숫자 인정 + 역번역에 원문 현장 용어 힌트."""
from app.services import translate


def test_native_digits_count_as_same_number():
    src = "순간풍속 10m/s 이상이면 양중을 중지하세요"
    ne = translate.meaning_check(src, "हावा १० मि/से भन्दा बढी", "순간풍속 10m/s 이상이면 양중을 중지하세요")
    th = translate.meaning_check(src, "ลม ๑๐ ม./วิ", "순간풍속 10m/s 이상이면 양중을 중지하세요")
    assert ne["ok"] and th["ok"]
    wrong = translate.meaning_check(src, "हावा १२ मि/से", "순간풍속 12m/s 이상이면 양중을 중지하세요")
    assert wrong["missing"] == ["10"]


def test_back_translation_prompt_carries_source_terms(monkeypatch):
    seen = {}

    class P:
        name = "fake"

        def complete(self, system, prompt):
            seen.setdefault("prompts", []).append(prompt)
            return "단부 작업 전 안전대를 거세요" if "to Korean" in prompt else "Móc dây đai an toàn"

    monkeypatch.setattr(translate, "get_provider", lambda: P())
    r = translate.with_back_translation("단부 작업 전 안전대를 거세요", "vi")
    back_prompt = [p for p in seen["prompts"] if "to Korean" in p][0]
    assert "단부" in back_prompt and "안전대" in back_prompt
    assert r["meaning"]["ok"]
