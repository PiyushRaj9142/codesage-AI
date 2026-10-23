"""
Overview Dashboard API endpoints.
Computes real database metrics and recent repository activity.
"""
from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.models.repository import Repository, IndexJob
from app.models.evaluation import EvaluationRun
from app.schemas.repository import RepositoryResponse

router = APIRouter(prefix="/overview", tags=["Overview"])


@router.get("")
async def get_overview_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Returns real aggregated metrics for the overview dashboard:
    total workspaces, total repositories, indexed repos, active jobs, recent evaluations.
    """
    # Workspaces user belongs to
    ws_stmt = (
        select(Workspace.id)
        .join(WorkspaceMember, Workspace.id == WorkspaceMember.workspace_id)
        .where(WorkspaceMember.user_id == current_user.id)
    )
    ws_ids = (await db.execute(ws_stmt)).scalars().all()

    total_workspaces = len(ws_ids)

    # Repositories in these workspaces
    repo_stmt = select(Repository).where(Repository.workspace_id.in_(ws_ids)).order_by(Repository.updated_at.desc())
    repos = (await db.execute(repo_stmt)).scalars().all()

    total_repositories = len(repos)
    indexed_repositories = sum(1 for r in repos if r.status == "ready")
    jobs_in_progress = sum(1 for r in repos if r.status in {"pending", "cloning", "filtering", "parsing", "embedding"})

    # Recent evaluation runs
    eval_stmt = select(EvaluationRun).order_by(EvaluationRun.created_at.desc()).limit(5)
    recent_evals = (await db.execute(eval_stmt)).scalars().all()

    recent_repos_data = [RepositoryResponse.model_validate(r) for r in repos[:6]]

    # Recent activity events
    activities = []
    for r in repos[:10]:
        if r.status == "ready":
            activities.append({
                "id": f"act_{r.id}",
                "type": "index_completed",
                "title": f"Indexed repository '{r.name}'",
                "timestamp": r.updated_at.isoformat(),
                "details": f"{r.file_count} files, {r.chunk_count} code chunks"
            })
        elif r.status == "failed":
            activities.append({
                "id": f"act_{r.id}",
                "type": "index_failed",
                "title": f"Indexing failed for '{r.name}'",
                "timestamp": r.updated_at.isoformat(),
                "details": r.error_message or "Unknown error"
            })
        else:
            activities.append({
                "id": f"act_{r.id}",
                "type": "index_running",
                "title": f"Ingesting '{r.name}'",
                "timestamp": r.updated_at.isoformat(),
                "details": f"Stage: {r.status}"
            })

    return {
        "summary": {
            "total_workspaces": total_workspaces,
            "total_repositories": total_repositories,
            "indexed_repositories": indexed_repositories,
            "jobs_in_progress": jobs_in_progress,
            "recent_evaluations_count": len(recent_evals)
        },
        "recent_repositories": recent_repos_data,
        "recent_activity": activities,
        "recent_evaluations": [
            {
                "id": ev.id,
                "configuration_name": ev.configuration_name,
                "recall_at_5": ev.recall_at_5,
                "mrr": ev.mrr,
                "latency_ms": ev.latency_ms,
                "created_at": ev.created_at.isoformat()
            }
            for ev in recent_evals
        ]
    }
