"""
Repository and IndexJob database models.
"""
from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, ForeignKey, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.workspace import Workspace
    from app.models.code_file import CodeFile, FileDependency
    from app.models.conversation import Conversation


class Repository(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "repositories"

    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    source_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    source_type: Mapped[str] = mapped_column(String(20), default="git", nullable=False)  # "git", "zip"
    branch: Mapped[Optional[str]] = mapped_column(String(100), default="main", nullable=True)
    commit_sha: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False, index=True)  # "pending", "cloning", "filtering", "parsing", "embedding", "ready", "failed"
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    file_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    primary_language: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Relationships
    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="repositories")
    files: Mapped[List["CodeFile"]] = relationship("CodeFile", back_populates="repository", cascade="all, delete-orphan")
    dependencies: Mapped[List["FileDependency"]] = relationship("FileDependency", back_populates="repository", cascade="all, delete-orphan")
    conversations: Mapped[List["Conversation"]] = relationship("Conversation", back_populates="repository", cascade="all, delete-orphan")
    index_jobs: Mapped[List["IndexJob"]] = relationship("IndexJob", back_populates="repository", cascade="all, delete-orphan")


class IndexJob(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "index_jobs"

    repository_id: Mapped[str] = mapped_column(String(36), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False)  # "pending", "running", "completed", "failed"
    stage: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)   # "pending", "cloning", "filtering", "parsing", "embedding", "ready", "failed"
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)           # 0 to 100 percent
    error_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    safe_error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    repository: Mapped["Repository"] = relationship("Repository", back_populates="index_jobs")
