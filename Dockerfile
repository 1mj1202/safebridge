# 공개 배포용 한 서버 이미지 (Render 등): 프런트엔드를 빌드해 백엔드가 같은 주소에서 내보낸다.
# 로컬 다중 컨테이너 실행은 docker-compose.yml (backend/Dockerfile + frontend/Dockerfile) 그대로.
FROM node:22-slim AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npx vite build

FROM python:3.13-slim
RUN apt-get update && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
COPY --from=web /web/dist /app/web-dist
ENV PYTHONUNBUFFERED=1 SAFEBRIDGE_WEB_DIST=/app/web-dist
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
