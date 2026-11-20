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
