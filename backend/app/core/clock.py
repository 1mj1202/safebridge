"""'오늘' — 서비스 시간대 기준, 시연 시 SAFEBRIDGE_DEMO_TODAY 로 고정 가능."""
from datetime import date, datetime
from zoneinfo import ZoneInfo

from .config import get_settings


def today() -> date:
    s = get_settings()
    if s.demo_today:
        return date.fromisoformat(s.demo_today)
    return datetime.now(ZoneInfo(s.service_timezone)).date()
