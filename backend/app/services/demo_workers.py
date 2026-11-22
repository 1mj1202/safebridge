"""시연용 가상 근로자 — 최근 발행 TBM 의 작업 구역에 팀 구성대로 배치한다.

실제 가입자와 섞이지 않게 pin_hash 를 DEMO 로 둔다(PIN 로그인 불가). 위치 화면은 이 근로자를
'방금 태그한 사람'으로 보여 준다(locations.snapshot). 다시 돌리면 이전 가상 근로자를 지우고 새로 넣는다.
"""
from __future__ import annotations

import random
import secrets

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import Assessment, CheckIn, Tbm, Worker
from app.services import schedule, site

DEMO = "demo"  # pin_hash 표식

# 언어별 가상 이름(실존 인물 아님)
NAMES = {
    "ko": ["김민수", "이준호", "박성진", "최영훈", "정대현", "강동욱", "윤재석", "장현우", "임태경", "한상철",
           "오세훈", "서진우", "신동혁", "권혁준", "황인성", "송민재"],
    "vi": ["Nguyen Van An", "Tran Minh Duc", "Le Hoang Nam", "Pham Quoc Bao", "Vo Thanh Long", "Do Van Hung"],
    "zh": ["王伟", "李强", "张磊", "刘洋", "陈杰", "杨帆"],
    "th": ["Somchai K.", "Anan P.", "Prasert W.", "Wichai S.", "Niran T.", "Kittisak B."],
    "en": ["John Reyes", "Mark Santos", "Ali Khan", "David Cruz"],
}
PER_TEAM = (2, 4)  # 구역·팀마다 인원
UNDERSTOOD = 0.7  # 이해 확인 누른 비율(나머지는 '미확인'으로 보인다)


def clear(db: Session) -> int:
    ids = list(db.scalars(select(Worker.id).where(Worker.pin_hash == DEMO)))
    if ids:
        db.execute(delete(CheckIn).where(CheckIn.worker_id.in_(ids)))
        db.execute(delete(Worker).where(Worker.id.in_(ids)))
        db.commit()
    return len(ids)


def _latest_tbm(db: Session) -> Tbm | None:
    return db.scalar(select(Tbm).order_by(Tbm.published_at.desc(), Tbm.id.desc()).limit(1))


def _zones(a: Assessment) -> list[dict]:
    zones = site.assignments(schedule.tasks_on(a.work_date, a.storey or None))
    return zones or site.assignments(schedule.tasks_on(a.work_date))


def seed(db: Session, seed_value: int = 7) -> dict:
    """가상 근로자를 넣는다. {"tbm_id", "workers", "zones"} — 발행 TBM 이 없으면 workers=0."""
    clear(db)
    t = _latest_tbm(db)
    if t is None:
        return {"tbm_id": None, "workers": 0, "zones": []}
    rnd = random.Random(seed_value)
    used: set[str] = set()  # 업체가 달라도 같은 이름은 한 번만
    pools = {lg: rnd.sample(n, len(n)) for lg, n in NAMES.items()}
    count, zones = 0, []
    for z in _zones(t.assessment):
        zones.append(z["zone"])
        for team in z["teams"]:
            langs = (site.team_for(team["trade"]) or {}).get("langs") or ["ko"]
            for _ in range(rnd.randint(*PER_TEAM)):
                lang = rnd.choices(langs, weights=[1 if lg == "ko" else 2 for lg in langs])[0]  # 외국인 근로자 비중
                pool = pools.get(lang) or pools["ko"]
                name = next((n for n in pool if n not in used), None)
                if name is None:
                    continue
                used.add(name)
                w = Worker(name=name, company=team["company"], team=team["team"], lang=lang,
                           pin_hash=DEMO, token="demo-" + secrets.token_urlsafe(24))
                db.add(w)
                db.flush()
                c = CheckIn(worker_id=w.id, tbm_id=t.id, zone=z["zone"], source=rnd.choice(("qr", "qr", "nfc")))
                db.add(c)
                db.flush()
                if rnd.random() < UNDERSTOOD:
                    c.understood_at = c.seen_at
                w.last_checkin_id = c.id
                count += 1
    db.commit()
    return {"tbm_id": t.id, "workers": count, "zones": zones}


def is_demo(w: Worker) -> bool:
    return w.pin_hash == DEMO


def minutes_ago(w: Worker) -> int:
    """가상 근로자는 늘 '조금 전 태그'(2~45분)로 보인다 — 시연 날 4시간이 지나도 오래됨이 되지 않게."""
    return 2 + (w.id * 7) % 44
