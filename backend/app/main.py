"""
CodeSage AI - Main FastAPI Application.
Repository-Aware AI Software Engineering Assistant with Hybrid RAG.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import init_db, AsyncSessionLocal
from app.services.evaluation_service import evaluation_service
from app.api.auth import router as auth_router
from app.api.workspaces import router as workspaces_router
from app.api.repositories import router as repositories_router
from app.api.chat import router as chat_router
from app.api.analysis import router as analysis_router
from app.api.evaluations import router as evaluations_router
from app.api.overview import router as overview_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist and seed default benchmark dataset
    await init_db()
    async with AsyncSessionLocal() as session:
        try:
            await evaluation_service.get_or_create_default_dataset(session)
        except Exception:
            pass
    yield
    # Shutdown logic if needed


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="CodeSage AI: An Intelligent Repository-Aware Software Engineering Assistant Using Hybrid Retrieval-Augmented Generation",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers under /api
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(workspaces_router, prefix=settings.API_V1_STR)
app.include_router(repositories_router, prefix=settings.API_V1_STR)
app.include_router(chat_router, prefix=settings.API_V1_STR)
app.include_router(analysis_router, prefix=settings.API_V1_STR)
app.include_router(evaluations_router, prefix=settings.API_V1_STR)
app.include_router(overview_router, prefix=settings.API_V1_STR)


@app.get("/api/health", tags=["Health"])
async def health_check():
    """Health check endpoint disclosing provider configurations and runtime readiness."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "llm_provider": settings.LLM_PROVIDER,
        "embedding_provider": settings.EMBEDDING_PROVIDER,
        "embedding_dimension": settings.EMBEDDING_DIMENSION,
        "qdrant_configured": bool(settings.QDRANT_URL),
        "database_configured": bool(settings.DATABASE_URL)
    }
