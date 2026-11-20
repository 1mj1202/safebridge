# 아키텍처

```
[데이터]  공공데이터 CSV ─scripts/public_data→ data/accidents·risk_profile·accident_stats·synonyms·kosha_guides.json     샘플 IFC(engine/sample_ifc)     가상 예보 / 기상청     조문 요약
             │                                              │ IfcOpenShell 추출
             ▼                                              ▼
[도구]   get_activities(4D·공종키·구역 팀)  get_spatial_hazards  query_hazard_rules(P·S)  search_cases  get_guides  get_regulation  get_weather  get_accident_stats(w)
             └──────────────┬──────────────────────────────────────────────────────────────┘
                            ▼
[에이전트] app/agent/runner: LLM tool calling 루프 → 필수 도구 보완 → draft.build(코드: 항목·근거) → ranking(R = P×S×w + 기상, 상위 5) → briefing(구역별 브리핑 골격)
                            → LLM 이 설명·대책·유의사항 작성(JSON) → 병합
                            ▼
[관리자]  초안 수정·승인 → 발행: tbm.build_cards(문장 은행, 10개 언어) + 평면도 + 관리자 한마디 번역·역번역 → QR
                            ▼
[근로자]  /w/<토큰>?zone=: 언어·구역 → 구역 브리핑·음성 → 질문(브리핑 안에서만 답) · 문제 알리기(번역·요약·긴급도 → 반장·공사담당·안전관리자) → 회신 번역
```

## LLM 공급자 (app/llm)

`LLMProvider.conversation(system, tools)` → `Conversation.add_user / step / add_tool_results`.
에이전트 루프는 이 인터페이스만 쓰고, 메시지 형식은 공급자가 바꾼다.

- `claude`: Anthropic SDK Messages API. 응답 content(thinking 포함)를 그대로 대화에 붙이고, 안전 분류기 거절 시 서버 측 대체 모델(`fallbacks="default"`)
- `ollama`: `/api/chat` + `tools`. 도구 호출 인자가 문자열이면 JSON 으로 파싱
- `mock`: 정해진 순서로 도구를 부르고 템플릿 문장을 쓴다. 번역은 하지 않는다(원문 + 실패 표시)

## 위험도 기준 (시연용)

빈도 = 해당 공종 사례 중 그 위험(사고유형·기인물) 비중 → 1~3, 강도 = 사망 비율 → 1~3 (추락·붕괴는 최소 3).
빈도 × 강도 ≥ 6 상, ≥ 3 중, 그 외 하. 관리자가 초안에서 바꿀 수 있다.

## 공간 위험 규칙 (engine/spatial_risk.py)

| 영역 | 조건 | 근거 |
|---|---|---|
| 슬래브 단부 1m 띠 (추락) | 그 층 거푸집·철근·타설 진행 | 제42조, 제13조 |
| 개구부 둘레 0.6m (추락) | 같음 | 제43조 |
| 개구부 직하부, 작업 슬래브 하부, 외곽 지상 2m (낙하) | 같음 | 제14조 |

## API

`GET /api/bim/model` · `GET /api/schedule` · `GET /api/risk?date=` · `POST /api/agent/assess` ·
`GET|PUT /api/assessments/{id}` · `POST /api/assessments/{id}/approve|publish` · `GET /api/tbms/{id}/status` ·
`GET /api/w/{token}?lang=` · `POST /api/w/{token}/ack|report` · `GET /api/w/{token}/zones|brief?zone=` · `POST /api/w/{token}/chat|issue` · `GET /api/w/{token}/issues/{id}?key=` · `GET /api/tbms/{id}/issues` · `POST /api/issues/{id}/answer` · `GET /api/accidents/{id}` · `GET /api/guides/{id}` · `GET /api/profile/{id}` · `GET /api/law/{id}` · `GET /api/meta`
FastAPI 문서: http://localhost:8000/docs
