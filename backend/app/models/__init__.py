"""DB 표 — 근로자 개인정보(이름·연락처·위치)는 저장하지 않는다. 확인·신고는 언어별 익명 집계만."""
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Assessment(Base):
    """위험성평가 초안 → 관리자 수정 → 승인."""

    __tablename__ = "assessments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    work_date: Mapped[str] = mapped_column(String(10))
    storey: Mapped[str] = mapped_column(String(10), default="")
    query: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(10), default="draft")  # draft | approved
    draft: Mapped[dict] = mapped_column(JSON)
    trace: Mapped[list] = mapped_column(JSON, default=list)  # 에이전트 도구 호출 기록
    provider: Mapped[str] = mapped_column(String(20), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    tbms: Mapped[list["Tbm"]] = relationship(back_populates="assessment")


class Tbm(Base):
    """발행된 TBM — QR 토큰으로 근로자가 로그인 없이 접속."""

    __tablename__ = "tbms"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    assessment_id: Mapped[int] = mapped_column(ForeignKey("assessments.id"))
    token: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    cards: Mapped[dict] = mapped_column(JSON)  # {lang: [card, card, card]}
    translation_check: Mapped[dict] = mapped_column(JSON, default=dict)  # 역번역·용어 유지 결과
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    assessment: Mapped[Assessment] = relationship(back_populates="tbms")
    acks: Mapped[list["Ack"]] = relationship(back_populates="tbm")
    reports: Mapped[list["Report"]] = relationship(back_populates="tbm")


class Ack(Base):
    __tablename__ = "acks"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tbm_id: Mapped[int] = mapped_column(ForeignKey("tbms.id"))
    lang: Mapped[str] = mapped_column(String(5))
    status: Mapped[str] = mapped_column(String(12))  # understood | question
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    tbm: Mapped[Tbm] = relationship(back_populates="acks")


class Report(Base):
    """근로자 질문·위험 신고 (모국어 원문 + 한국어 번역)."""

    __tablename__ = "reports"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tbm_id: Mapped[int] = mapped_column(ForeignKey("tbms.id"))
    kind: Mapped[str] = mapped_column(String(10))  # question | hazard
    lang: Mapped[str] = mapped_column(String(5))
    text_original: Mapped[str] = mapped_column(Text)
    text_ko: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    tbm: Mapped[Tbm] = relationship(back_populates="reports")
