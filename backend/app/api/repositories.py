"""
Repository API endpoints.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db, AsyncSessionLocal
from app.core.dependencies import get_current_user, verify_workspace_access, verify_repository_access
from app.models.user import User
from app.models.repository import Repository
from app.schemas.repository import (
    RepositoryCreateGit, RepositoryResponse, RepositoryStatusResponse,
    CodeFileSummary, CodeFileDetail, DependencyGraphResponse
)
from app.services.repository_service import repository_service
from app.ingestion.pipeline import pipeline

router = APIRouter(prefix="/repositories", tags=["Repositories"])


async def _run_indexing_background(repository_id: str):
    """Runs ingestion pipeline in a fresh async DB session."""
    async with AsyncSessionLocal() as session:
        await pipeline.run_indexing(session, repository_id)


@router.get("", response_model=List[RepositoryResponse])
async def list_repositories(
    workspace_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists repositories in the workspace or all accessible workspaces."""
    stmt = select(Repository)
    if workspace_id:
        await verify_workspace_access(workspace_id, current_user, db, min_role="viewer")
        stmt = stmt.where(Repository.workspace_id == workspace_id)
    repos = (await db.execute(stmt)).scalars().all()
    return [RepositoryResponse.model_validate(r) for r in repos]


@router.post("/git", response_model=RepositoryResponse)
async def import_git_repository(
    data: RepositoryCreateGit,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Imports a public Git repository and starts background indexing."""
    await verify_workspace_access(data.workspace_id, current_user, db, min_role="editor")
    repo_res = await repository_service.create_git_repository(db, data.workspace_id, data)
    background_tasks.add_task(_run_indexing_background, repo_res.id)
    return repo_res


@router.post("/zip", response_model=RepositoryResponse)
async def upload_zip_repository(
    background_tasks: BackgroundTasks,
    workspace_id: str = Form(...),
    name: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Uploads a ZIP archive codebase and starts background indexing."""
    await verify_workspace_access(workspace_id, current_user, db, min_role="editor")
    repo_res = await repository_service.create_zip_repository(db, workspace_id, name, file)
    background_tasks.add_task(_run_indexing_background, repo_res.id)
    return repo_res


@router.post("/{id}/index", response_model=RepositoryStatusResponse)
async def trigger_indexing(
    id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Triggers or retries indexing for a repository."""
    await verify_repository_access(id, current_user, db, min_role="editor")
    background_tasks.add_task(_run_indexing_background, id)
    return await repository_service.get_repository_status(db, id)


@router.get("/{id}", response_model=RepositoryResponse)
async def get_repository(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Gets details for a single repository."""
    repo = await verify_repository_access(id, current_user, db, min_role="viewer")
    return RepositoryResponse.model_validate(repo)


@router.get("/{id}/status", response_model=RepositoryStatusResponse)
async def get_repository_status(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Polls indexing progress, current stage, and error details."""
    await verify_repository_access(id, current_user, db, min_role="viewer")
    return await repository_service.get_repository_status(db, id)


@router.get("/{id}/files", response_model=List[CodeFileSummary])
async def get_repository_files(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists indexed code files for a repository."""
    await verify_repository_access(id, current_user, db, min_role="viewer")
    return await repository_service.get_repository_files(db, id)


@router.get("/{id}/files/{file_id}", response_model=CodeFileDetail)
async def get_file_content(
    id: str,
    file_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves file code content for syntax-highlighted citation viewing."""
    await verify_repository_access(id, current_user, db, min_role="viewer")
    return await repository_service.get_file_detail(db, id, file_id)


@router.get("/{id}/dependencies", response_model=DependencyGraphResponse)
async def get_repository_dependencies(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetches architecture and file dependency graph for React Flow visualization."""
    await verify_repository_access(id, current_user, db, min_role="viewer")
    return await repository_service.get_dependency_graph(db, id)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_repository(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deletes repository, files, chunks, and vector payloads."""
    repo = await verify_repository_access(id, current_user, db, min_role="owner")
    await repository_service.delete_repository(db, repo)
