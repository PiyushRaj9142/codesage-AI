"""
FastAPI dependency injection utilities for authentication and authorization.
Enforces workspace and repository-level access control.
"""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.core.security import decode_token
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.models.repository import Repository

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    token_auth: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Authenticates the user from the Bearer token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token_auth:
        raise credentials_exception

    payload = decode_token(token_auth.credentials)
    if not payload or payload.get("type") != "access":
        raise credentials_exception

    user_id: str = payload.get("sub")
    if not user_id:
        raise credentials_exception

    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception

    return user


async def verify_workspace_access(
    workspace_id: str,
    user: User,
    db: AsyncSession,
    min_role: str = "viewer"
) -> Workspace:
    """Verifies that the user has sufficient role permissions in the workspace."""
    stmt = select(Workspace).where(Workspace.id == workspace_id)
    result = await db.execute(stmt)
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")

    if workspace.owner_id == user.id:
        return workspace

    # Check member role
    stmt_member = select(WorkspaceMember).where(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user.id
    )
    result_member = await db.execute(stmt_member)
    member = result_member.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this workspace")

    role_hierarchy = {"viewer": 1, "editor": 2, "owner": 3}
    if role_hierarchy.get(member.role, 0) < role_hierarchy.get(min_role, 1):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient workspace permissions")

    return workspace


async def verify_repository_access(
    repository_id: str,
    user: User,
    db: AsyncSession,
    min_role: str = "viewer"
) -> Repository:
    """Verifies that the user has authorized access to the repository via its workspace."""
    stmt = select(Repository).where(Repository.id == repository_id)
    result = await db.execute(stmt)
    repository = result.scalar_one_or_none()
    if not repository:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found")

    await verify_workspace_access(repository.workspace_id, user, db, min_role)
    return repository
