"""
RAG Evaluation API endpoints.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.core.dependencies import get_current_user, verify_repository_access
from app.models.user import User
from app.models.evaluation import EvaluationRun, EvaluationResult, EvaluationItem
from app.schemas.evaluation import (
    EvaluationDatasetResponse, EvaluationRunCreate,
    EvaluationRunResponse, EvaluationResultDetail
)
from app.services.evaluation_service import evaluation_service

router = APIRouter(prefix="/evaluations", tags=["Evaluations"])


@router.get("/datasets", response_model=List[EvaluationDatasetResponse])
async def list_datasets(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists available evaluation datasets."""
    return await evaluation_service.list_datasets(db)


@router.post("", response_model=EvaluationRunResponse)
async def run_evaluation(
    data: EvaluationRunCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Executes an evaluation experiment across retrieval configurations."""
    await verify_repository_access(data.repository_id, current_user, db, min_role="editor")
    return await evaluation_service.run_evaluation(db, data)


@router.get("", response_model=List[EvaluationRunResponse])
async def list_evaluation_runs(
    repository_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists historical evaluation runs."""
    if repository_id:
        await verify_repository_access(repository_id, current_user, db, min_role="viewer")
    return await evaluation_service.list_runs(db, repository_id)


@router.get("/{id}", response_model=EvaluationRunResponse)
async def get_evaluation_run(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Gets detailed per-question results and failure diagnostics for a run."""
    run_stmt = select(EvaluationRun).where(EvaluationRun.id == id)
    run = (await db.execute(run_stmt)).scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Evaluation run not found")

    await verify_repository_access(run.repository_id, current_user, db, min_role="viewer")

    # Fetch detailed results
    res_stmt = (
        select(EvaluationResult, EvaluationItem)
        .join(EvaluationItem, EvaluationResult.item_id == EvaluationItem.id)
        .where(EvaluationResult.run_id == run.id)
    )
    res_rows = (await db.execute(res_stmt)).all()

    details = []
    for res, item in res_rows:
        details.append(EvaluationResultDetail(
            item_id=item.id,
            question=item.question,
            category=item.category,
            is_hit_at_5=res.is_hit_at_5,
            reciprocal_rank=res.reciprocal_rank,
            citation_valid=res.citation_valid,
            latency_ms=res.latency_ms,
            generated_answer=res.generated_answer
        ))

    return EvaluationRunResponse(
        id=run.id,
        dataset_id=run.dataset_id,
        repository_id=run.repository_id,
        configuration_name=run.configuration_name,
        status=run.status,
        recall_at_5=round(run.recall_at_5, 3),
        mrr=round(run.mrr, 3),
        citation_accuracy=round(run.citation_accuracy, 3),
        abstention_accuracy=round(run.abstention_accuracy, 3),
        latency_ms=round(run.latency_ms, 1),
        total_questions=run.total_questions,
        answered_questions=run.answered_questions,
        created_at=run.created_at,
        results=details
    )
