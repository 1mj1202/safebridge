"""근로자 계정·구역 태그 기록.

받는 정보는 이름·소속 업체·언어·4자리 PIN(해시만)뿐이다. 전화번호·GPS 는 받지 않는다.
위치는 '마지막으로 태그한 구역'이다(QR·NFC 만, 직접 고른 구역은 교육만 열고 위치는 그대로).
"""
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Worker(Base):
    __tablename__ = "workers"
    __table_args__ = (UniqueConstraint("company", "name"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(40))
    company: Mapped[str] = mapped_column(String(60))
    team: Mapped[str] = mapped_column(String(40), default="")
    lang: Mapped[str] = mapped_column(String(5), default="ko")
    pin_hash: Mapped[str] = mapped_column(String(120))
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)  # 로그인 쿠키 값
    last_checkin_id: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 마지막 태그(checkins.id)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class CheckIn(Base):
    """구역 태그 1건 — 그 구역 교육을 이해했다고 누르면 understood_at 이 찍힌다."""

    __tablename__ = "checkins"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    worker_id: Mapped[int] = mapped_column(ForeignKey("workers.id"), index=True)
    tbm_id: Mapped[int] = mapped_column(ForeignKey("tbms.id"), index=True)
    zone: Mapped[str] = mapped_column(String(40))
    source: Mapped[str] = mapped_column(String(5), default="qr")  # qr | nfc
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)  # 같은 구역 재태그 시각
    understood_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
