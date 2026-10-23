"""
Conversation, Message, and Citation database models.
"""
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, Float, Boolean, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.repository import Repository
    from app.models.code_chunk import CodeChunk


class Conversation(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "conversations"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    repository_id: Mapped[str] = mapped_column(String(36), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), default="New Chat", nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="conversations")
    repository: Mapped["Repository"] = relationship("Repository", back_populates="conversations")
    messages: Mapped[List["Message"]] = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")


class Message(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "messages"

    conversation_id: Mapped[str] = mapped_column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # "user", "assistant", "system"
    content: Mapped[str] = mapped_column(Text, nullable=False)
    insufficient_evidence: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    conversation: Mapped["Conversation"] = relationship("Conversation", back_populates="messages")
    citations: Mapped[List["Citation"]] = relationship("Citation", back_populates="message", cascade="all, delete-orphan")


class Citation(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "citations"

    message_id: Mapped[str] = mapped_column(String(36), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("code_chunks.id", ondelete="SET NULL"), nullable=True, index=True)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    symbol_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    start_line: Mapped[int] = mapped_column(Integer, nullable=False)
    end_line: Mapped[int] = mapped_column(Integer, nullable=False)
    relevance_score: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    citation_label: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # E1, E2, etc.

    # Relationships
    message: Mapped["Message"] = relationship("Message", back_populates="citations")
    chunk: Mapped[Optional["CodeChunk"]] = relationship("CodeChunk")
