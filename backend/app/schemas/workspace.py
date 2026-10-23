"""
Workspace Pydantic schemas.
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)


class WorkspaceUpdate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)


class WorkspaceMemberAdd(BaseModel):
    email: str
    role: str = Field(default="editor", pattern="^(owner|editor|viewer)$")


class WorkspaceMemberResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    role: str
    created_at: datetime


class WorkspaceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    owner_id: str
    role: str = "owner"
    repositories_count: int = 0
    members_count: int = 1
    created_at: datetime
    updated_at: datetime
