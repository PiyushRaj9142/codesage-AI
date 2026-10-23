"""
CodeFile and FileDependency database models.
"""
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.repository import Repository
    from app.models.code_chunk import CodeChunk


class CodeFile(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "code_files"

    repository_id: Mapped[str] = mapped_column(String(36), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    path: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    language: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    commit_sha: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    file_size: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # cached source content for direct citation display

    # Relationships
    repository: Mapped["Repository"] = relationship("Repository", back_populates="files")
    chunks: Mapped[List["CodeChunk"]] = relationship("CodeChunk", back_populates="file", cascade="all, delete-orphan")


class FileDependency(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "file_dependencies"

    repository_id: Mapped[str] = mapped_column(String(36), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    source_file_id: Mapped[str] = mapped_column(String(36), ForeignKey("code_files.id", ondelete="CASCADE"), nullable=False, index=True)
    target_file_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("code_files.id", ondelete="SET NULL"), nullable=True, index=True)
    target_path: Mapped[str] = mapped_column(String(500), nullable=False)
    import_symbol: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Relationships
    repository: Mapped["Repository"] = relationship("Repository", back_populates="dependencies")
    source_file: Mapped["CodeFile"] = relationship("CodeFile", foreign_keys=[source_file_id])
    target_file: Mapped[Optional["CodeFile"]] = relationship("CodeFile", foreign_keys=[target_file_id])
