"""
Workspace management service.
"""
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, status
from app.models.workspace import Workspace, WorkspaceMember
from app.models.repository import Repository
from app.models.user import User
from app.schemas.workspace import (
    WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse,
    WorkspaceMemberAdd, WorkspaceMemberResponse
)


class WorkspaceService:
    async def get_user_workspaces(self, db: AsyncSession, user_id: str) -> List[WorkspaceResponse]:
        # Fetch workspaces where user is owner or member
        stmt = (
            select(Workspace, WorkspaceMember.role)
            .join(WorkspaceMember, Workspace.id == WorkspaceMember.workspace_id)
            .where(WorkspaceMember.user_id == user_id)
        )
        res = await db.execute(stmt)
        rows = res.all()

        results = []
        for ws, role in rows:
            # Count repositories
            repo_count_stmt = select(func.count(Repository.id)).where(Repository.workspace_id == ws.id)
            repo_count = (await db.execute(repo_count_stmt)).scalar() or 0

            # Count members
            member_count_stmt = select(func.count(WorkspaceMember.id)).where(WorkspaceMember.workspace_id == ws.id)
            member_count = (await db.execute(member_count_stmt)).scalar() or 1

            results.append(WorkspaceResponse(
                id=ws.id,
                name=ws.name,
                owner_id=ws.owner_id,
                role=role,
                repositories_count=repo_count,
                members_count=member_count,
                created_at=ws.created_at,
                updated_at=ws.updated_at
            ))
        return results

    async def create_workspace(self, db: AsyncSession, user_id: str, data: WorkspaceCreate) -> WorkspaceResponse:
        ws = Workspace(name=data.name, owner_id=user_id)
        db.add(ws)
        await db.flush()

        member = WorkspaceMember(workspace_id=ws.id, user_id=user_id, role="owner")
        db.add(member)
        await db.commit()
        await db.refresh(ws)

        return WorkspaceResponse(
            id=ws.id,
            name=ws.name,
            owner_id=ws.owner_id,
            role="owner",
            repositories_count=0,
            members_count=1,
            created_at=ws.created_at,
            updated_at=ws.updated_at
        )

    async def update_workspace(self, db: AsyncSession, workspace: Workspace, data: WorkspaceUpdate) -> WorkspaceResponse:
        workspace.name = data.name
        await db.commit()
        await db.refresh(workspace)
        return WorkspaceResponse(
            id=workspace.id,
            name=workspace.name,
            owner_id=workspace.owner_id,
            role="owner",
            repositories_count=0,
            members_count=1,
            created_at=workspace.created_at,
            updated_at=workspace.updated_at
        )

    async def delete_workspace(self, db: AsyncSession, workspace: Workspace):
        await db.delete(workspace)
        await db.commit()


workspace_service = WorkspaceService()
