"""관리자 쪽(안전관리자·현장소장·발주처/감리) 로그인 세션 표.

서버를 다시 켜도 로그인이 풀리지 않도록 DB에 둔다. 쿠키에는 무작위 세션값만 들어간다.
"""
from sqlalchemy import Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class StaffSession(Base):
    __tablename__ = "staff_sessions"

    sid: Mapped[str] = mapped_column(String(64), primary_key=True)
    role: Mapped[str] = mapped_column(String(16))
    last_used: Mapped[float] = mapped_column(Float)  # time.time()
