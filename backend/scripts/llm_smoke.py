"""실제 LLM 연결 확인 — 에이전트 1회 + 번역·역번역 + 신고 번역을 돌려 결과를 출력한다.

    SAFEBRIDGE_LLM_PROVIDER=ollama python -m scripts.llm_smoke
    SAFEBRIDGE_LLM_PROVIDER=claude ANTHROPIC_API_KEY=... python -m scripts.llm_smoke

통과 기준: 모델이 도구를 직접 불렀는가(자동 보완 0~1회), 설명 JSON 을 썼는가, 번역이 원문과 다른가.
"""
from __future__ import annotations

import sys
import time
from datetime import date

from app.agent import runner
from app.llm.factory import get_provider
from app.services import translate


def main() -> int:
    p = get_provider()
    print(f"공급자: {p.name}")
    if p.name == "mock":
        print("SAFEBRIDGE_LLM_PROVIDER 를 claude 또는 ollama 로 지정하세요")
        return 2
    ok = True

    t = time.time()
    r = runner.run(p, "내일 3층 작업 위험 알려줘", date(2026, 11, 23))
    d = r["draft"]
    by_model = [x["tool"] for x in r["trace"] if not x["auto"]]
    auto = [x["tool"] for x in r["trace"] if x["auto"]]
    print(f"\n[에이전트] {time.time() - t:.1f}초")
    print(f"  모델이 부른 도구: {by_model}")
    print(f"  코드가 보완한 도구: {auto}")
    print(f"  LLM 메모: {d['llm_note'] or '없음'}")
    print(f"  요약: {d['summary']}")
    for it in d["items"][:3]:
        print(f"  - {it['id']} {it['hazard']}: {it['explanation']}")
    if not by_model or d["llm_note"]:
        ok = False

    t = time.time()
    memo = translate.with_back_translation("오늘은 바람이 강하니 단부 작업 전 꼭 안전대를 거세요", "vi")
    print(f"\n[번역·역번역 vi] {time.time() - t:.1f}초")
    print(f"  번역: {memo['translated']}\n  역번역: {memo['back']}\n  용어 유지: {memo['terms']}")
    ok = ok and memo["ok"] and memo["translated"] != memo["source"]

    t = time.time()
    rep = translate.translate("Lan can ở góc phía bắc bị lỏng", "vi", "ko")
    print(f"\n[신고 번역 vi→ko] {time.time() - t:.1f}초\n  {rep['text']}")
    ok = ok and rep["ok"]

    print("\n결과:", "통과" if ok else "확인 필요")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
