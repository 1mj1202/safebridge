"""설정 — 환경변수 접두어 SAFEBRIDGE_ (bim-dcm 과 같은 방식)."""
import os
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SAFEBRIDGE_", env_file=".env", extra="ignore")

    database_url: str = f"sqlite:///{BACKEND_DIR / 'var' / 'safebridge.db'}"
    data_dir: Path = BACKEND_DIR / "data"
    ifc_path: Path = BACKEND_DIR / "samples" / "safebridge_sample.ifc"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:8080"]
    service_timezone: str = "Asia/Seoul"
    demo_today: str = ""  # 시연용 '오늘' 고정 (예: 2026-11-23). 비우면 실제 날짜

    # LLM 공급자: claude | ollama | mock  (시연은 ollama, 키 없는 개발·테스트는 mock)
    llm_provider: str = "mock"
    claude_model: str = "claude-opus-5-5"
    claude_effort: str = "medium"
    ollama_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "qwen3:8b"
    llm_timeout: float = 120.0

    # 외부 API (없으면 가상 데이터로 대체)
    kma_service_key: str = ""      # 기상청 단기예보 (공공데이터포털)
    law_api_oc: str = ""           # 법제처 국가법령정보 Open API OC
    kosha_service_key: str = ""    # 안전보건공단 안전보건자료 링크 서비스 (공공데이터포털, 영상 링크)

    # 안전시설 사진 증빙 저장 위치 (얼굴 흐림·촬영정보 제거 후)
    photo_dir: Path = BACKEND_DIR / "var" / "photos"

    # 관리자 화면 비밀번호. 비우면 잠그지 않는다(개발·테스트). 공개 배포 때는 꼭 넣는다
    admin_password: str = ""
    # 부류별 비밀번호 — 현장소장·원청(승인), 발주처·감리(보기 전용). 비우면 그 부류는 로그인 불가
    manager_password: str = ""
    viewer_password: str = ""
    # 관리자 화면을 이 시간(분) 동안 쓰지 않으면 자동 로그아웃 (마지막 사용 시각부터 셈)
    admin_idle_minutes: int = 15

    # 근로자 화면 주소(QR) — 배포 시 공개 주소로 바꾼다
    public_web_url: str = "http://localhost:5173"

    # 한 서버 배포(Render 등): 빌드된 프런트엔드 폴더. 비우면 화면을 내보내지 않는다
    web_dist: Path | None = None

    def model_post_init(self, _ctx) -> None:
        # Render 는 공개 https 주소를 RENDER_EXTERNAL_URL 로 넘겨 준다 → 따로 안 적어도 QR/NFC 가 그 주소로
        render_url = os.environ.get("RENDER_EXTERNAL_URL")
        if render_url and "SAFEBRIDGE_PUBLIC_WEB_URL" not in os.environ:
            self.public_web_url = render_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
