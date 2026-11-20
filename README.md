# SafeBridge 세이프브릿지

재해 데이터와 BIM으로 '오늘의 위험'을 찾고, 근로자의 언어로 전하는 청년 현장관리자용 AI 안전 TBM 에이전트입니다.
(2026 대한민국 청년 CAREER FAIR AI 해커톤 출품작)

신입 현장관리자가 "내일 3층 작업 위험 알려줘"라고 물으면, 에이전트가 4D 공정·재해 패턴·BIM 공간 위험·기상·조문 도구를 호출해
위험성평가 초안을 만들고(모든 항목에 근거 ID), 관리자가 검토·승인하면 QR로 근로자 휴대폰에 모국어·음성 TBM 카드 3장을 보냅니다.
근로자는 로그인 없이 "이해했어요 / 질문 있어요 / 위험 신고"를 누르고, 관리자는 언어별 이해 확인 현황과 한국어로 번역된 신고를 봅니다.

**원칙: 숫자·위치·판정은 코드가, 해석·작성은 AI가.** 위험 영역·위험도·기상 판정·카드 번역(문장 은행)은 결정론적이고,
LLM은 도구 선택과 설명 문장, 관리자 한마디·근로자 신고 번역만 맡습니다. 그래서 LLM 없이(오프라인 모드)도 시연 흐름 전체가 동작합니다.

## 구현 범위

- **재해 패턴 DB**: 실제 공공데이터 사고사례 3,484건(안전보건공단 SIF 건설업 사망사고 3,459건 + 국토안전관리원 사고사례 25건)을 공종 × 사고유형 × 기인물 × 원인 × 대책으로 집계, 문자 2-gram TF-IDF 유사사례 검색(안전보건공단 유의어사전으로 검색어 확장)
- **위험도 근거**: 국토안전관리원 위험요소 프로파일(철근콘크리트·가설공사)의 공종×사고유형별 사고가능성·심각성 평균으로 빈도×강도 산정, 항목마다 관련 KOSHA GUIDE, 기상 항목에는 날씨별 사고 통계
- **BIM·4D**: 샘플 IFC 생성기(5층 RC 골조, 개구부 2개/층) → IfcOpenShell 추출 → 공정(층별 골조 사이클) 연결, 날짜별 부재 상태(완료·진행·미시공)
- **공간 위험**: 슬래브 작업 층 단부 1m 띠·개구부 둘레(추락, 빨강), 작업 슬래브 하부·개구부 직하부·외곽 지상(낙하, 주황), 영역마다 부재 ID·조문 ID
- **안전 에이전트**: LLM tool calling 도구 5개(공정·재해 패턴·공간 위험·기상·조문), 빠진 필수 도구는 코드가 보완 호출, 근거 없는 항목은 '확인 불가'
- **LLM 공급자 교체**: `SAFEBRIDGE_LLM_PROVIDER=claude | ollama | mock` — 개발은 Claude API, 시연은 Ollama 로컬 모델, 키 없으면 mock
- **다국어 TBM**: 한국어·영어·중국어·베트남어·태국어, 안전용어 고정 번역 사전 20개 + 카드 문장 은행, 언어별 핵심 용어 유지율, 관리자 한마디 번역·역번역
- **근로자 모바일 웹**: QR 접속(로그인 없음), 언어 선택, 평면도·픽토그램 카드 3장, 음성(Web Speech API), 큰 글씨 모드, 이해 확인, 모국어 질문·위험 신고 → 한국어 번역
- **관리자 화면**: 3D 위험구역(클릭 → 근거), 날짜 슬라이더, 진행 작업·기상 판정, 초안 수정·승인, TBM 발행(QR), 언어별 확인 현황(대면 재설명 대상 표시)
- **데이터 파이프라인**: 사고사례 CSV → LLM 구조화(`scripts/structure_accidents.py`), 수작업 라벨 대비 정확도 평가(`scripts/eval_structuring.py`)

개인정보: 카메라·위치추적·근로자 이름을 쓰지 않습니다. 확인·신고는 언어별 익명 집계로만 저장하고, 외부 LLM에는 작업·가상 데이터만 보냅니다.

## 폴더 구조

```
safebridge/
├─ backend/
│  ├─ engine/            샘플 IFC 생성기 · IFC 추출 · 4D 공정 생성 · 공간 위험 계산 (웹/DB 독립 모듈)
│  ├─ app/
│  │  ├─ core/           설정(SAFEBRIDGE_*) · DB · '오늘'(시간대·시연 고정)
│  │  ├─ models/         SQLAlchemy 표 (위험성평가 · TBM · 확인 · 신고)
│  │  ├─ llm/            공급자 인터페이스 + claude · ollama · mock + factory
│  │  ├─ agent/          에이전트 루프(runner) · 프롬프트 · 초안 골격(draft) · tools/ 도구 5개
│  │  ├─ services/       bim · schedule · risk · patterns · weather(+kma) · law · glossary · translate · tbm
│  │  ├─ api/            FastAPI 라우터 (bim · reference · assessments · worker)
│  │  └─ main.py         API 진입점
│  ├─ data/              사고사례·위험요소 프로파일·사고 통계·유의어·KOSHA GUIDE(공공데이터 변환) · 조문 요약 · 가상 예보 · 용어 사전 · 카드 문장 은행
│  ├─ scripts/           공공데이터 변환(public_data) · 가상 사례 생성 · 사고사례 구조화 · 정확도 평가 · 샘플 IFC 생성
│  ├─ samples/           샘플 IFC (가상, 생성기로 재현 가능)
│  └─ tests/             pytest
├─ frontend/             React 19 + TypeScript + Tailwind 4 + three.js
│  └─ src/features/      admin · viewer · assessment · tbm · worker
├─ docs/                 ARCHITECTURE.md
├─ .github/workflows/    CI (백엔드 pytest · 프런트 타입검사·vitest·빌드)
└─ docker-compose.yml    api · web (+ ollama, profile local-llm)
```

## 실행 방법

### A. 로컬 직접 실행 (이 저장소를 실제 검증한 방식)

필요한 환경: Python 3.13, Node 22.

```bash
# 백엔드
cd backend
pip install -r requirements.txt
SAFEBRIDGE_DEMO_TODAY=2026-11-23 uvicorn app.main:app --port 8000     # 기본 LLM = mock(오프라인)
# 프론트엔드
cd ../frontend && npm install && npm run dev                            # http://localhost:5173
```

LLM 바꾸기:

```bash
# Claude API (개발)
SAFEBRIDGE_LLM_PROVIDER=claude ANTHROPIC_API_KEY=sk-... uvicorn app.main:app --port 8000
# Ollama 로컬 모델 (시연)
ollama pull qwen3:8b
SAFEBRIDGE_LLM_PROVIDER=ollama uvicorn app.main:app --port 8000
```

시연 때 휴대폰으로 QR 접속: 같은 Wi-Fi에서 `VITE_HOST=0.0.0.0 npm run dev`, 백엔드에 `SAFEBRIDGE_PUBLIC_WEB_URL=http://<PC IP>:5173`.

### B. Docker Compose (공개 배포용)

```bash
cp .env.example .env
docker compose up --build                          # http://localhost:8080
docker compose --profile local-llm up --build      # + Ollama
```

### 환경변수 (접두어 `SAFEBRIDGE_`)

| 변수 | 기본값 | 설명 |
|---|---|---|
| `LLM_PROVIDER` | `mock` | `claude` · `ollama` · `mock` |
| `CLAUDE_MODEL` / `CLAUDE_EFFORT` | `claude-opus-5-5` / `medium` | Claude 모델·노력 수준 (`ANTHROPIC_API_KEY` 필요) |
| `OLLAMA_URL` / `OLLAMA_MODEL` | `http://127.0.0.1:11434` / `qwen3:8b` | 로컬 LLM |
| `DEMO_TODAY` | (비움) | 시연 '오늘' 고정. `2026-11-23`이면 '내일' = 3F 거푸집 설치일(강풍 예보) |
| `PUBLIC_WEB_URL` | `http://localhost:5173` | 근로자 QR 주소 |
| `KMA_SERVICE_KEY` | (비움) | 기상청 단기예보 서비스키. 없으면 가상 예보 |
| `LAW_API_OC` | (비움) | 법제처 Open API OC. 없으면 팀 요약 조문 |
| `DATABASE_URL` | `sqlite:///backend/var/safebridge.db` | DB |

## 공공데이터 다시 변환하기

학습자료(Data.zip)를 풀어 둔 폴더를 넘기면 `backend/data/` 의 JSON 5개를 다시 만듭니다. 원본 CSV 는 용량이 커서 저장소에 넣지 않습니다(`backend/data/raw/` 에 두면 git 이 무시).

```bash
cd backend
python -m scripts.public_data --src data/raw
```

| 원본 | 결과 | 쓰임 |
|---|---|---|
| 안전보건공단 사망사고 고위험요인(SIF) 건설업, 국토안전관리원 위험요소프로파일 사고사례 | `accidents.json` | 재해 패턴·유사사례 |
| 국토안전관리원 설계안전성검토 위험요소 프로파일 | `risk_profile.json` | 위험도(사고가능성·심각성) |
| 국토안전관리원 건설안전사고 재해자특성, 안전보건공단 시간대별 사고사망자수 | `accident_stats.json` | 날씨별 사고, 사망 최다 시간대 |
| 안전보건공단 산업현장 법률용어 유의어사전 | `synonyms.json` | 유사사례 검색어 확장 |
| 안전보건공단 KOSHA GUIDE 목록(건설안전 C) | `kosha_guides.json` | 항목별 관련 지침 |

분류 대응(공종 4종·사고유형·기인물)은 `scripts/public_data/mapping.py` 한 곳에 있습니다. SIF 는 사망사고 자료라서 화면의 건수는 "사망사고 사례 중 비중"으로 표시합니다.

## 다른 사고사례 CSV 구조화하기 (선택)

```bash
cd backend
SAFEBRIDGE_LLM_PROVIDER=claude python -m scripts.structure_accidents uploads/cases.csv \
    --map 사고경위=사고경위내용 --out data/accidents.json
python -m scripts.eval_structuring data/labels.csv        # 라벨 100건 대비 공종·사고유형·기인물 정확도
```

CSV 기본 열: `사고번호, 발생일, 공종, 사고경위, 사고원인, 재발방지대책, 인명피해` (다르면 `--map`).

## 검증 현황

- 백엔드 pytest 22개, 프런트 vitest 9개, 타입검사·빌드 통과
- 헤드리스 브라우저로 관리자 흐름(분석 → 3D 영역 → 승인 → 발행)과 근로자 흐름(언어 선택 → 카드 → 신고 → 이해 확인 → 관리자 현황 반영)을 mock 공급자로 확인
- **아직 확인하지 못한 것**: 실제 Claude API·Ollama 모델 호출(작성 환경에 키·모델 없음, 공급자 형식 변환은 단위 테스트로만 확인), Docker 기동, 기상청 API 실호출
- 사고사례·위험요소·통계는 실제 공공데이터, 현장·공정·예보는 가상. 조문은 팀 요약이며 제출 전 법제처 원문 대조 필요. 용어 사전은 원어민 검수 전
