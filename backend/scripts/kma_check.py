"""기상청 키 확인: python -m scripts.kma_check  (backend 폴더에서, .env 의 SAFEBRIDGE_KMA_SERVICE_KEY 사용, 키는 출력하지 않음)."""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from app.core.config import get_settings
from app.services import kma

key = get_settings().kma_service_key
if not key:
    raise SystemExit("SAFEBRIDGE_KMA_SERVICE_KEY 가 비어 있음 → 가상 예보 사용 중")
items = kma.fetch(key)
today = datetime.now(ZoneInfo("Asia/Seoul")).date()
print(f"응답 {len(items)}행, 발표 {items[0]['baseDate']} {items[0]['baseTime']}")
for d in range(3):
    day = (today + timedelta(days=d)).isoformat()
    try:
        print(kma.summarize(items, day))
    except ValueError as e:
        print(day, e)
