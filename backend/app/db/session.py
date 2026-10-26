"""
Database engine and session management.
Supports PostgreSQL (with asyncpg) and SQLite (with aiosqlite for zero-config local dev).
"""
import os
from pathlib import Path
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings
from app.db.base import Base

WORKSPACE_ROOT = Path(__file__).resolve().parents[3]

# Database engine initialization
database_url = settings.DATABASE_URL
# Adjust driver if needed
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif "sqlite" in database_url and "///." in database_url:
    # Normalize relative sqlite path to absolute workspace path so it is invariant to execution cwd
    rel_path = database_url.split("///.")[-1].lstrip("/")
    abs_db_path = (WORKSPACE_ROOT / rel_path).resolve()
    database_url = f"sqlite+aiosqlite:///{abs_db_path}"

# SQLite foreign key enforcement
connect_args = {}
if "sqlite" in database_url:
    connect_args = {"check_same_thread": False}

engine = create_async_engine(
    database_url,
    echo=False,
    future=True,
    connect_args=connect_args
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    """Initializes tables in database if they don't exist."""
    # Ensure storage directory exists
    os.makedirs(settings.STORAGE_PATH, exist_ok=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
