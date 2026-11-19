"""data/ JSON 읽기 (프로세스 안 캐시)."""
import json
from functools import lru_cache

from app.core.config import get_settings


@lru_cache
def load_json(name: str) -> dict:
    return json.loads((get_settings().data_dir / name).read_text(encoding="utf-8"))
