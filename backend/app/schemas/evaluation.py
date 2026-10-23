"""
RAG Evaluation Pydantic schemas.
"""
from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel, Field, ConfigDict


class EvaluationItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    question: str
    category: str
    expected_file_paths: List[str]
    is_answerable: bool


class EvaluationDatasetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: Optional[str] = None
    item_count: int = 0
    created_at: datetime


class EvaluationRunCreate(BaseModel):
    dataset_id: str
    repository_id: str
    configuration_name: str = Field(default="hybrid_rrf", pattern="^(vector_only|keyword_only|hybrid_rrf|hybrid_rerank)$")


class EvaluationResultDetail(BaseModel):
    item_id: str
    question: str
    category: str
    is_hit_at_5: bool
    reciprocal_rank: float
    citation_valid: bool
    latency_ms: float
    generated_answer: Optional[str] = None


class EvaluationRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    dataset_id: str
    repository_id: str
    configuration_name: str
    status: str
    recall_at_5: float
    mrr: float
    citation_accuracy: float
    abstention_accuracy: float
    latency_ms: float
    total_questions: int
    answered_questions: int
    created_at: datetime
    results: List[EvaluationResultDetail] = []


class EvaluationComparison(BaseModel):
    configurations: List[str]
    runs: List[EvaluationRunResponse]
