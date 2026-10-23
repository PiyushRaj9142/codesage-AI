"""
Repository Pydantic schemas.
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, HttpUrl, Field, ConfigDict


class RepositoryCreateGit(BaseModel):
    workspace_id: str
    name: str = Field(..., min_length=2, max_length=150)
    source_url: str = Field(..., description="Public Git repository HTTPS URL")
    branch: Optional[str] = "main"


class RepositoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    name: str
    source_url: Optional[str] = None
    source_type: str = "git"
    branch: Optional[str] = "main"
    commit_sha: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    file_count: int = 0
    chunk_count: int = 0
    primary_language: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class RepositoryStatusResponse(BaseModel):
    repository_id: str
    status: str
    stage: str
    progress: int
    error_code: Optional[str] = None
    safe_error_message: Optional[str] = None
    file_count: int
    chunk_count: int


class CodeFileSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    path: str
    language: str
    file_size: int
    chunk_count: int = 0


class CodeFileDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    repository_id: str
    path: str
    language: str
    commit_sha: Optional[str] = None
    file_size: int
    content: Optional[str] = None


class DependencyNode(BaseModel):
    id: str
    path: str
    language: str
    file_size: int
    inbound_count: int
    outbound_count: int


class DependencyEdge(BaseModel):
    id: str
    source: str
    target: str
    import_symbol: Optional[str] = None


class DependencyGraphResponse(BaseModel):
    nodes: List[DependencyNode]
    edges: List[DependencyEdge]
    languages: List[str]
    total_files: int
    total_dependencies: int
