"""
Chat and Citation Pydantic schemas.
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class CitationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[str] = None
    chunk_id: Optional[str] = None
    file_path: str
    symbol_name: Optional[str] = None
    start_line: int
    end_line: int
    relevance_score: float = 1.0
    citation_label: Optional[str] = None  # E1, E2, etc.


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    conversation_id: str
    role: str
    content: str
    insufficient_evidence: bool = False
    citations: List[CitationResponse] = []
    created_at: datetime


class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    repository_id: str
    title: str
    summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    messages: List[MessageResponse] = []


class ChatRequest(BaseModel):
    repository_id: str
    question: str = Field(..., min_length=2, max_length=4000)
    conversation_id: Optional[str] = None
    stream: bool = True


class StreamDelta(BaseModel):
    event: str  # "delta", "status", "citation", "complete", "error"
    data: dict
