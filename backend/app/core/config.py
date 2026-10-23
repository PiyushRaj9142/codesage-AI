"""
Application configuration for CodeSage AI.
Supports environment variables with sensible local development defaults.
"""
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    PROJECT_NAME: str = "CodeSage AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # Security & Authentication
    SECRET_KEY: str = Field(default="dev-codesage-insecure-secret-key-change-in-production-min32chars", validation_alias="SECRET_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    # Primary: PostgreSQL. Fallback for standalone zero-dependency dev/test: SQLite
    DATABASE_URL: str = Field(default="sqlite+aiosqlite:///./codesage.db", validation_alias="DATABASE_URL")
    POSTGRES_USER: str = "codesage"
    POSTGRES_PASSWORD: str = "codesage_dev_secret"
    POSTGRES_DB: str = "codesagedb"

    # Vector Storage
    QDRANT_URL: Optional[str] = Field(default=None, validation_alias="QDRANT_URL")
    QDRANT_API_KEY: Optional[str] = Field(default=None, validation_alias="QDRANT_API_KEY")
    QDRANT_COLLECTION: str = "code_chunks"
    EMBEDDING_DIMENSION: int = 384  # standard lightweight code embedding dimension

    # Redis & Task Queue
    REDIS_URL: Optional[str] = Field(default=None, validation_alias="REDIS_URL")
    USE_IN_PROCESS_TASKS: bool = True  # Allows async tasks to execute in FastAPI without Celery/Redis if needed

    # AI Model Providers
    # Options: "mock", "openai", "anthropic", "gemini", "ollama"
    LLM_PROVIDER: str = Field(default="mock", validation_alias="LLM_PROVIDER")
    LLM_API_KEY: Optional[str] = Field(default=None, validation_alias="LLM_API_KEY")
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_BASE_URL: Optional[str] = None  # for Ollama or OpenAI-compatible proxies

    # Embeddings Provider
    # Options: "mock", "openai", "gemini", "local"
    EMBEDDING_PROVIDER: str = Field(default="mock", validation_alias="EMBEDDING_PROVIDER")
    EMBEDDING_API_KEY: Optional[str] = Field(default=None, validation_alias="EMBEDDING_API_KEY")
    EMBEDDING_MODEL: str = "text-embedding-3-small"

    # Ingestion & Limits
    MAX_UPLOAD_SIZE_MB: int = 50
    MAX_FILE_COUNT: int = 1500
    MAX_REPO_DISK_MB: int = 250
    ALLOWED_GIT_HOSTS: List[str] = ["github.com", "gitlab.com", "bitbucket.org"]
    STORAGE_PATH: str = "./storage"

    # Retrieval parameters
    RRF_K: int = 60
    VECTOR_CANDIDATE_COUNT: int = 30
    KEYWORD_CANDIDATE_COUNT: int = 30
    FINAL_EVIDENCE_COUNT: int = 10
    MAX_CONTEXT_TOKENS: int = 3500

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]


settings = Settings()
