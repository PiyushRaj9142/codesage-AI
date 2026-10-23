"""
Developer Intelligence Analysis API endpoints.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.dependencies import get_current_user, verify_repository_access
from app.models.user import User
from app.schemas.analysis import (
    ErrorInvestigationRequest, ErrorInvestigationResponse,
    ImpactAnalysisRequest, ImpactAnalysisResponse,
    DocumentationRequest, DocumentationResponse
)
from app.services.analysis_service import analysis_service

router = APIRouter(prefix="/analysis", tags=["Analysis"])


@router.post("/error", response_model=ErrorInvestigationResponse)
async def investigate_error(
    request: ErrorInvestigationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Parses stack trace, isolates affected source lines, and recommends fixes."""
    await verify_repository_access(request.repository_id, current_user, db, min_role="viewer")
    return await analysis_service.investigate_error(db, request)


@router.post("/impact", response_model=ImpactAnalysisResponse)
async def analyze_impact(
    request: ImpactAnalysisRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Calculates reverse dependency blast radius and test exposure for a target file."""
    await verify_repository_access(request.repository_id, current_user, db, min_role="viewer")
    return await analysis_service.analyze_impact(db, request)


@router.post("/docs/generate", response_model=DocumentationResponse)
async def generate_documentation(
    request: DocumentationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Synthesizes reviewable documentation drafts with line citations."""
    await verify_repository_access(request.repository_id, current_user, db, min_role="viewer")
    return await analysis_service.generate_documentation(db, request)
