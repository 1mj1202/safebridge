# 공개 배포

화면과 API 를 **한 주소**에서 낸다: 백엔드에 `SAFEBRIDGE_WEB_DIST=<frontend/dist 경로>` 를 주면
빌드된 프런트엔드를 함께 내보낸다 (`backend/app/web/spa.py`). QR/NFC 주소는 `SAFEBRIDGE_PUBLIC_WEB_URL`.

## 1) 지금: 시연 PC + Ollama + Tailscale Funnel
PC 가 켜져 있고 서버가 돌 때만 열린다. Ollama 는 PC 안(127.0.0.1)에만 있다.

```powershell
cd frontend; npm run build; cd ..
# backend\.env
#   SAFEBRIDGE_LLM_PROVIDER=ollama
#   SAFEBRIDGE_WEB_DIST=..\frontend\dist
#   SAFEBRIDGE_PUBLIC_WEB_URL=https://<pc 이름>.<tailnet>.ts.net
uvicorn app.main:app --host 127.0.0.1 --port 8000
tailscale funnel --bg 8000        # 최초 1회 Funnel 승인 링크가 뜰 수 있다
```
https 라서 근로자 화면의 NFC 태그 쓰기도 동작한다.

## 2) 나중에: Render + Claude API (PC 없이)
저장소 루트의 `Dockerfile`(한 서버 이미지)·`render.yaml`(Blueprint) 사용.
Render 에서 New > Blueprint → 이 저장소, `ANTHROPIC_API_KEY`·`SAFEBRIDGE_KOSHA_SERVICE_KEY` 는 Render 화면에 직접 입력.
공개 주소는 Render 가 주는 `RENDER_EXTERNAL_URL` 을 자동으로 쓴다.
무료 플랜은 15분 미사용 시 잠들고, 재시작하면 사진·이슈 기록이 초기화된다.
