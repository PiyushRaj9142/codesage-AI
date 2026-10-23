"""
CodeChunk database model.
"""
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.code_file import CodeFile


class CodeChunk(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "code_chunks"

    file_id: Mapped[str] = mapped_column(String(36), ForeignKey("code_files.id", ondelete="CASCADE"), nullable=False, index=True)
    symbol_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, index=True)
    chunk_type: Mapped[str] = mapped_column(String(50), default="block", nullable=False, index=True)  # function, class, method, route, doc, block
    start_line: Mapped[int] = mapped_column(Integer, nullable=False)
    end_line: Mapped[int] = mapped_column(Integer, nullable=False)
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)
    context_header: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # e.g., "File: src/auth.py | Class: AuthManager | Method: verify_token"
    vector_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    embedding_model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)

    # Relationships
    file: Mapped["CodeFile"] = relationship("CodeFile", back_populates="chunks")
