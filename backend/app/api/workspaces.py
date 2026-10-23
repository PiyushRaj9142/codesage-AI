"""
Workspace API endpoints.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.dependencies import get_current_user, verify_workspace_access
from app.models.user import User
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse
from app.services.workspace_service import workspace_service

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


@router.get("", response_model=List[WorkspaceResponse])
async def list_workspaces(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists all workspaces accessible to the authenticated user."""
    return await workspace_service.get_user_workspaces(db, current_user.id)


@router.post("", response_model=WorkspaceResponse)
async def create_workspace(
    data: WorkspaceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Creates a new workspace with current user as owner."""
    return await workspace_service.create_workspace(db, current_user.id, data)


@router.get("/{id}", response_model=WorkspaceResponse)
async def get_workspace(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves workspace details if authorized."""
    ws = await verify_workspace_access(id, current_user, db, min_role="viewer")
    workspaces = await workspace_service.get_user_workspaces(db, current_user.id)
    for w in workspaces:
        if w.id == id:
            return w
    raise HTTPException(status_code=404, detail="Workspace not found")


@router.patch("/{id}", response_model=WorkspaceResponse)
async def update_workspace(
    id: str,
    data: WorkspaceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Renames workspace (requires owner or editor role)."""
    ws = await verify_workspace_access(id, current_user, db, min_role="editor")
    return await workspace_service.update_workspace(db, ws, data)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deletes workspace (requires owner role)."""
    ws = await verify_workspace_access(id, current_user, db, min_role="owner")
    await workspace_service.delete_workspace(db, ws)
