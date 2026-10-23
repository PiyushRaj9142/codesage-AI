"""
Developer intelligence analysis Pydantic schemas.
"""
from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.chat import CitationResponse


class ErrorInvestigationRequest(BaseModel):
    repository_id: str
    error_trace: str = Field(..., min_length=5, max_length=15000, description="Stack trace or error message")


class ErrorInvestigationResponse(BaseModel):
    error_summary: str
    probable_cause: str
    evidence_citations: List[CitationResponse] = []
    suggested_fix: str
    tests_to_consider: List[str] = []
    uncertainty_notes: Optional[str] = None


class ImpactAnalysisRequest(BaseModel):
    repository_id: str
    target_path: str = Field(..., description="File path or module to analyze impact for")
    max_depth: int = Field(default=3, ge=1, le=5)


class ImpactNode(BaseModel):
    file_path: str
    impact_level: str  # "direct", "transitive", "test"
    reason: str


class ImpactAnalysisResponse(BaseModel):
    target_path: str
    direct_dependents: List[str]
    transitive_dependents: List[str]
    affected_tests: List[str]
    public_api_risks: List[str]
    impact_nodes: List[ImpactNode]
    limitation_warning: str


class DocumentationRequest(BaseModel):
    repository_id: str
    doc_type: str = Field(default="readme", pattern="^(readme|api|module|architecture)$")
    target_module: Optional[str] = None


class DocumentationResponse(BaseModel):
    doc_type: str
    title: str
    markdown_content: str
    evidence_citations: List[CitationResponse] = []
    is_draft: bool = True
