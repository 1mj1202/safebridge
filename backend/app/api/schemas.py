"""요청 본문 스키마."""
from pydantic import BaseModel, Field


class AssessRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    date: str | None = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    storey: str | None = None


class ItemEdit(BaseModel):
    id: str
    explanation: str | None = None
    measures: list[str] | None = None
    level: str | None = Field(None, pattern="^(상|중|하)$")
    included: bool | None = None


class DraftEdit(BaseModel):
    summary: str | None = None
    notes: list[str] | None = None
    items: list[ItemEdit] = []


class PublishRequest(BaseModel):
    memo: str = Field("", max_length=300)  # 관리자 한마디(자유 문장 → 번역·역번역)


class AckRequest(BaseModel):
    lang: str
    status: str = Field(..., pattern="^(viewed|understood|question)$")
    zone: str = Field("", max_length=40)  # 로그인한 근로자면 그 구역 태그에 '이해함'을 남긴다
    tally: bool = True  # False: 언어별 익명 집계는 이미 했음(같은 기기 두 번째 구역부터)


class ReportRequest(BaseModel):
    lang: str
    kind: str = Field("hazard", pattern="^(question|hazard)$")
    text: str = Field(..., min_length=1, max_length=500)


class ChatRequest(BaseModel):
    lang: str
    zone: str = Field(..., min_length=1, max_length=40)
    message: str = Field(..., min_length=1, max_length=500)


class IssueRequest(BaseModel):
    lang: str
    zone: str = Field("", max_length=40)
    text: str = Field(..., min_length=1, max_length=500)


class AnswerRequest(BaseModel):
    text_ko: str = Field(..., min_length=1, max_length=500)


class PhotoRequest(BaseModel):
    lang: str
    zone: str = Field(..., min_length=1, max_length=40)
    request: str = Field("", max_length=40)
    image: str = Field(..., min_length=10, max_length=12_000_000)  # base64 (data URL 가능)


PIN = Field(..., pattern=r"^\d{4}$")


class SignupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=40)
    company: str = Field(..., min_length=1, max_length=60)
    lang: str
    pin: str = PIN


class WorkerLoginRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=40)
    company: str = Field(..., min_length=1, max_length=60)
    pin: str = PIN


class CheckInRequest(BaseModel):
    zone: str = Field(..., min_length=1, max_length=40)
    source: str = Field("qr", pattern="^(qr|nfc|pick)$")
