"""현장 챗봇 근거에 붙이는 작업일 날씨 — 예보 숫자 + 온도별 정해 둔 안전 기준(한국어).

'너무 더워요/추워요' 같은 질문에 실제 예보 온도로 답하게 한다. 기준 문장은 여기 고정해 두고
모델은 이 안에서만 답한다 (근거 없는 수치를 지어내지 않게).
기준: 최고기온 33℃ 이상 폭염(고용노동부 온열질환 예방 가이드의 물·그늘·휴식), 최저기온 0℃ 이하 결빙·한랭.
"""
from __future__ import annotations

import logging

from . import weather

log = logging.getLogger(__name__)

HEAT_C = 33.0
COLD_C = 0.0

ALWAYS = [
    "더위 증상(어지러움·두통·메스꺼움·심한 땀)이 있으면 바로 작업을 멈추고 그늘에서 쉬며 물을 마시고 반장에게 알리세요.",
    "추위 증상(몸 떨림·손발 저림·감각 둔해짐)이 있으면 따뜻한 곳에서 쉬고 반장에게 알리세요.",
]


def context_lines(work_date: str) -> list[str]:
    try:
        fc = weather.forecast(work_date)
    except Exception as e:  # 예보를 못 가져와도 챗봇은 브리핑만으로 답한다
        log.warning("챗봇 날씨 조회 실패: %s", e)
        return []
    tmin, tmax = fc["temp_min"], fc["temp_max"]
    lines = [f"작업일 예보({work_date}, {fc.get('source', '예보')}): 최저 {tmin:g}℃, 최고 {tmax:g}℃, "
             f"순간풍속 최대 {fc['wind_gust']:g}m/s, 시간당 강수 {fc['rain_mm_h']:g}mm, 하늘 {fc.get('sky') or '-'}"]
    if tmax >= HEAT_C:
        lines.append(f"폭염 기준(최고 {HEAT_C:g}℃ 이상) 해당: 물을 자주 마시고, 1시간마다 그늘에서 10분 이상 쉬세요.")
    else:
        lines.append(f"폭염 기준(최고 {HEAT_C:g}℃ 이상) 해당 없음.")
    if tmin <= COLD_C:
        lines.append(f"한랭 기준(최저 {COLD_C:g}℃ 이하) 해당: 결빙·미끄럼 주의.")
    lines += [f"공통: {s}" for s in ALWAYS]
    return lines
