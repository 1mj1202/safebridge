"""시연용 가상 근로자 넣기/지우기.

  python -m scripts.seed_demo_workers          # 최근 발행 TBM 구역에 넣기(이전 가상 근로자는 지움)
  python -m scripts.seed_demo_workers --clear  # 가상 근로자만 지우기
"""
import sys

from app.core.db import SessionLocal, init_db
from app.services import demo_workers


def main() -> None:
    init_db()
    with SessionLocal() as db:
        if "--clear" in sys.argv:
            print(f"가상 근로자 {demo_workers.clear(db)}명 지움")
            return
        r = demo_workers.seed(db)
        if not r["workers"]:
            print("발행된 TBM 이 없어 넣지 않았습니다. TBM 을 먼저 발행하세요.")
            return
        print(f"TBM {r['tbm_id']} · 가상 근로자 {r['workers']}명 · 구역 {', '.join(r['zones'])}")


if __name__ == "__main__":
    main()
