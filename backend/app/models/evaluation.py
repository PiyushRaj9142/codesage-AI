"""
Evaluation database models for RAG benchmarking and verification.
"""
from typing import List, Optional
from sqlalchemy import String, Integer, Float, Boolean, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, UUIDMixin, TimestampMixin


class EvaluationDataset(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "evaluation_datasets"

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    repository_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("repositories.id", ondelete="SET NULL"), nullable=True, index=True)

    # Relationships
    items: Mapped[List["EvaluationItem"]] = relationship("EvaluationItem", back_populates="dataset", cascade="all, delete-orphan")
    runs: Mapped[List["EvaluationRun"]] = relationship("EvaluationRun", back_populates="dataset", cascade="all, delete-orphan")


class EvaluationItem(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "evaluation_items"

    dataset_id: Mapped[str] = mapped_column(String(36), ForeignKey("evaluation_datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    repository_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=True, index=True)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)  # location, explanation, symbol, cross_file, bug, unanswerable
    expected_file_paths: Mapped[str] = mapped_column(Text, nullable=False)  # JSON-serialized list of file paths
    expected_line_ranges: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON-serialized list of [[start, end], ...]
    reference_answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_answerable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    dataset: Mapped["EvaluationDataset"] = relationship("EvaluationDataset", back_populates="items")
    results: Mapped[List["EvaluationResult"]] = relationship("EvaluationResult", back_populates="item", cascade="all, delete-orphan")


class EvaluationRun(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "evaluation_runs"

    dataset_id: Mapped[str] = mapped_column(String(36), ForeignKey("evaluation_datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    repository_id: Mapped[str] = mapped_column(String(36), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    configuration_name: Mapped[str] = mapped_column(String(50), default="hybrid_rrf", nullable=False)  # vector_only, keyword_only, hybrid_rrf, hybrid_rerank
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False)  # pending, running, completed, failed
    recall_at_5: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    mrr: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    citation_accuracy: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    abstention_accuracy: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    latency_ms: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_questions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    answered_questions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    dataset: Mapped["EvaluationDataset"] = relationship("EvaluationDataset", back_populates="runs")
    results: Mapped[List["EvaluationResult"]] = relationship("EvaluationResult", back_populates="run", cascade="all, delete-orphan")


class EvaluationResult(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "evaluation_results"

    run_id: Mapped[str] = mapped_column(String(36), ForeignKey("evaluation_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    item_id: Mapped[str] = mapped_column(String(36), ForeignKey("evaluation_items.id", ondelete="CASCADE"), nullable=False, index=True)
    retrieved_chunks_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    generated_answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_hit_at_5: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reciprocal_rank: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    citation_valid: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    latency_ms: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Relationships
    run: Mapped["EvaluationRun"] = relationship("EvaluationRun", back_populates="results")
    item: Mapped["EvaluationItem"] = relationship("EvaluationItem", back_populates="results")
