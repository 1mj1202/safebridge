"""가상 사고사례 생성 — 실제 데이터(국토안전관리원 사례)가 오기 전 시연용.

출력은 '구조화가 끝난' 형식(data/accidents.json)이다. 실제 데이터는 scripts/structure_accidents.py 로
CSV → LLM 구조화 → 같은 형식으로 저장한다. 모든 사례에 virtual=true 를 붙여 실제 사례와 구분한다.

    python -m scripts.make_virtual_accidents
"""
from __future__ import annotations

import json
import random
from datetime import date, timedelta
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "data" / "accidents.json"

# (공종, 작업, 사고유형, 기인물, 경위 템플릿, 원인 후보, 대책 후보, 가중치)
TEMPLATES = [
    ("거푸집", "슬래브 거푸집 설치", "추락", "슬래브 단부",
     "{f}층 슬래브 거푸집 설치 중 피해자가 단부 쪽으로 합판을 옮기다 균형을 잃고 {h}m 아래로 떨어짐",
     ["안전난간 미설치", "안전대 미착용", "작업발판 단부 방호 미흡", "작업 순서 미준수"],
     ["단부 안전난간 선설치", "안전대 부착설비 설치 및 착용 확인", "추락방호망 설치"], 9),
    ("거푸집", "슬래브 거푸집 설치", "추락", "개구부",
     "{f}층 슬래브 거푸집 작업 중 덮개가 고정되지 않은 설비 개구부를 밟아 {h}m 아래로 추락",
     ["개구부 덮개 미고정", "개구부 표시 없음", "안전대 미착용"],
     ["개구부 덮개 고정 및 표시", "개구부 둘레 안전난간 설치", "작업 전 개구부 위치 공유"], 6),
    ("거푸집", "거푸집 해체", "낙하", "거푸집 자재",
     "{f}층 거푸집 해체 중 상부에서 떨어진 합판·각재에 하부 통행자가 맞음",
     ["하부 출입통제 미실시", "낙하물 방지망 미설치", "해체 자재 투하"],
     ["해체 구간 하부 출입금지 설정", "낙하물 방지망 설치", "자재 달줄·달포대 사용"], 5),
    ("거푸집", "동바리 설치", "붕괴", "동바리",
     "{f}층 슬래브 타설 전 동바리 일부가 좌굴하며 거푸집이 내려앉아 작업자가 깔림",
     ["동바리 간격 과다", "수평연결재 누락", "구조검토 미실시"],
     ["동바리 구조검토 및 설치 상태 점검", "수평연결재 설치", "타설 중 감시인 배치"], 4),
    ("철근", "슬래브 철근 배근", "추락", "슬래브 단부",
     "{f}층 슬래브 철근 배근 중 단부 철근을 정리하다 발을 헛디뎌 {h}m 아래로 떨어짐",
     ["안전난간 일부 해체 후 미복구", "안전대 미착용", "철근 위 보행 중 걸림"],
     ["해체한 안전난간 즉시 복구", "안전대 착용", "철근 위 통로용 발판 설치"], 6),
    ("철근", "기둥 철근 배근", "추락", "작업발판",
     "{f}층 기둥 철근 결속 중 이동식 사다리에서 미끄러져 떨어짐",
     ["사다리 고정 미흡", "작업발판 미사용", "2인1조 미준수"],
     ["말비계·작업발판 사용", "사다리 전도방지 조치", "2인1조 작업"], 4),
    ("철근", "철근 운반", "협착", "철근 다발",
     "{f}층으로 인양한 철근 다발을 내리던 중 다발과 기둥 사이에 손이 끼임",
     ["신호 체계 불일치", "유도로프 미사용"],
     ["신호수 배치 및 신호 통일", "유도로프 사용", "인양물 하부·측면 접근 금지"], 3),
    ("타설", "슬래브 콘크리트 타설", "추락", "슬래브 단부",
     "{f}층 슬래브 타설 중 펌프카 호스를 잡고 뒷걸음질하다 단부로 떨어짐",
     ["단부 안전난간 미설치", "호스 반동", "작업 위치 단부 근접"],
     ["타설 전 단부 안전난간 점검", "호스 담당 2인 배치", "단부 1m 이내 작업 금지 표시"], 4),
    ("타설", "슬래브 콘크리트 타설", "붕괴", "거푸집·동바리",
     "{f}층 슬래브 타설 중 한쪽으로 콘크리트가 몰려 거푸집이 붕괴하고 작업자가 함께 떨어짐",
     ["편심 타설", "동바리 점검 미실시", "타설 속도 과다"],
     ["분산 타설 계획 수립", "타설 중 동바리 감시인 배치", "이상 시 즉시 대피"], 3),
    ("양중", "타워크레인 자재 인양", "낙하", "인양 자재",
     "타워크레인으로 {f}층에 거푸집 자재를 인양하던 중 결속이 풀려 자재가 하부로 떨어짐",
     ["줄걸이 불량", "인양물 하부 출입통제 미실시", "강풍 중 작업"],
     ["줄걸이 상태 점검", "인양 경로 하부 출입금지", "순간풍속 기준 초과 시 작업중지"], 6),
    ("양중", "타워크레인 자재 인양", "충돌", "인양 자재",
     "강풍으로 흔들린 인양물이 {f}층 단부 작업자와 부딪혀 작업자가 넘어짐",
     ["강풍 중 인양", "유도로프 미사용", "신호수 미배치"],
     ["기상 확인 후 작업 여부 결정", "유도로프 사용", "신호수 배치"], 3),
]


def generate(n: int = 60, seed: int = 20261119) -> list[dict]:
    rnd = random.Random(seed)
    weights = [t[-1] for t in TEMPLATES]
    cases = []
    for i in range(n):
        trade, work, acc_type, obj, story, causes, measures, _ = rnd.choices(TEMPLATES, weights=weights)[0]
        floor = rnd.randint(2, 15)
        height = round(floor * 3.0 * rnd.uniform(0.25, 1.0), 1) if acc_type == "추락" else 0
        when = date(2021, 1, 1) + timedelta(days=rnd.randint(0, 1700))
        chosen_causes = rnd.sample(causes, k=min(len(causes), rnd.randint(1, 2)))
        severity = rnd.choices(["사망", "부상"], weights=[2, 5])[0]
        cases.append({
            "case_id": f"VC-{i + 1:03d}",
            "virtual": True,
            "date": when.isoformat(),
            "trade": trade,
            "work": work,
            "accident_type": acc_type,
            "cause_object": obj,
            "causes": chosen_causes,
            "measures": measures,
            "severity": severity,
            "confidence": round(rnd.uniform(0.75, 0.98), 2),
            "raw_text": story.format(f=floor, h=height) + f". 원인: {', '.join(chosen_causes)}.",
        })
    return cases


if __name__ == "__main__":
    data = {"_note": "가상 사고사례(시연용, 실제 사례 아님). 실제 데이터 업로드 시 교체.", "cases": generate()}
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{OUT} ({len(data['cases'])}건)")
