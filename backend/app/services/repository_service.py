"""
Repository management and query service.
"""
import os
import shutil
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from fastapi import HTTPException, status, UploadFile
from app.core.config import settings
from app.models.repository import Repository, IndexJob
from app.models.code_file import CodeFile, FileDependency
from app.models.code_chunk import CodeChunk
from app.schemas.repository import (
    RepositoryCreateGit, RepositoryResponse, RepositoryStatusResponse,
    CodeFileSummary, CodeFileDetail, DependencyGraphResponse, DependencyNode, DependencyEdge
)
from app.ingestion.archive import extract_zip_archive
from app.ingestion.pipeline import pipeline
from app.retrieval.vector import vector_store


class RepositoryService:
    async def create_git_repository(
        self,
        db: AsyncSession,
        workspace_id: str,
        data: RepositoryCreateGit
    ) -> RepositoryResponse:
        repo = Repository(
            workspace_id=workspace_id,
            name=data.name,
            source_url=data.source_url,
            source_type="git",
            branch=data.branch or "main",
            status="pending"
        )
        db.add(repo)
        await db.flush()

        job = IndexJob(
            repository_id=repo.id,
            status="pending",
            stage="pending",
            progress=0
        )
        db.add(job)
        await db.commit()
        await db.refresh(repo)

        return RepositoryResponse.model_validate(repo)

    async def create_zip_repository(
        self,
        db: AsyncSession,
        workspace_id: str,
        name: str,
        file: UploadFile
    ) -> RepositoryResponse:
        # Check size and extension
        if not file.filename.endswith(".zip"):
            raise HTTPException(status_code=400, detail="Only .zip archives are supported.")

        repo = Repository(
            workspace_id=workspace_id,
            name=name,
            source_type="zip",
            status="pending"
        )
        db.add(repo)
        await db.flush()

        # Save uploaded zip file temporarily
        temp_zip_path = os.path.join(settings.STORAGE_PATH, f"upload_{repo.id}.zip")
        work_dir = os.path.join(settings.STORAGE_PATH, f"repo_{repo.id}")
        os.makedirs(settings.STORAGE_PATH, exist_ok=True)

        try:
            with open(temp_zip_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            extract_zip_archive(temp_zip_path, work_dir)
        finally:
            if os.path.exists(temp_zip_path):
                os.remove(temp_zip_path)

        job = IndexJob(
            repository_id=repo.id,
            status="pending",
            stage="pending",
            progress=0
        )
        db.add(job)
        await db.commit()
        await db.refresh(repo)

        return RepositoryResponse.model_validate(repo)

    async def get_repository_status(self, db: AsyncSession, repo_id: str) -> RepositoryStatusResponse:
        repo_stmt = select(Repository).where(Repository.id == repo_id)
        repo = (await db.execute(repo_stmt)).scalar_one_or_none()
        if not repo:
            raise HTTPException(status_code=404, detail="Repository not found")

        job_stmt = select(IndexJob).where(IndexJob.repository_id == repo_id).order_by(IndexJob.created_at.desc())
        job = (await db.execute(job_stmt)).scalars().first()

        return RepositoryStatusResponse(
            repository_id=repo.id,
            status=repo.status,
            stage=job.stage if job else repo.status,
            progress=job.progress if job else (100 if repo.status == "ready" else 0),
            error_code=job.error_code if job else None,
            safe_error_message=job.safe_error_message if job else repo.error_message,
            file_count=repo.file_count,
            chunk_count=repo.chunk_count
        )

    async def get_repository_files(self, db: AsyncSession, repo_id: str) -> List[CodeFileSummary]:
        stmt = select(CodeFile).where(CodeFile.repository_id == repo_id).order_by(CodeFile.path.asc())
        res = await db.execute(stmt)
        files = res.scalars().all()

        summaries = []
        for f in files:
            count_stmt = select(func.count(CodeChunk.id)).where(CodeChunk.file_id == f.id)
            c_count = (await db.execute(count_stmt)).scalar() or 0
            summaries.append(CodeFileSummary(
                id=f.id,
                path=f.path,
                language=f.language,
                file_size=f.file_size,
                chunk_count=c_count
            ))
        return summaries

    async def get_file_detail(self, db: AsyncSession, repo_id: str, file_id: str) -> CodeFileDetail:
        stmt = select(CodeFile).where(CodeFile.repository_id == repo_id, CodeFile.id == file_id)
        f = (await db.execute(stmt)).scalar_one_or_none()
        if not f:
            raise HTTPException(status_code=404, detail="File not found")
        return CodeFileDetail.model_validate(f)

    async def get_dependency_graph(self, db: AsyncSession, repo_id: str) -> DependencyGraphResponse:
        # Fetch files
        files_stmt = select(CodeFile).where(CodeFile.repository_id == repo_id)
        files = (await db.execute(files_stmt)).scalars().all()
        file_map = {f.id: f for f in files}
        path_to_id = {f.path: f.id for f in files}

        # Fetch dependencies
        dep_stmt = select(FileDependency).where(FileDependency.repository_id == repo_id)
        deps = (await db.execute(dep_stmt)).scalars().all()

        inbound_counts = {f.id: 0 for f in files}
        outbound_counts = {f.id: 0 for f in files}
        edges = []

        for d in deps:
            outbound_counts[d.source_file_id] = outbound_counts.get(d.source_file_id, 0) + 1
            # Resolve target ID if matched
            target_id = d.target_file_id or path_to_id.get(d.target_path)
            if target_id and target_id in file_map:
                inbound_counts[target_id] = inbound_counts.get(target_id, 0) + 1
                edges.append(DependencyEdge(
                    id=d.id,
                    source=d.source_file_id,
                    target=target_id,
                    import_symbol=d.import_symbol
                ))

        nodes = [
            DependencyNode(
                id=f.id,
                path=f.path,
                language=f.language,
                file_size=f.file_size,
                inbound_count=inbound_counts.get(f.id, 0),
                outbound_count=outbound_counts.get(f.id, 0)
            )
            for f in files
        ]

        langs = list(set(f.language for f in files))

        return DependencyGraphResponse(
            nodes=nodes,
            edges=edges,
            languages=langs,
            total_files=len(nodes),
            total_dependencies=len(edges)
        )

    async def delete_repository(self, db: AsyncSession, repo: Repository):
        # 1. Clean Qdrant vectors
        await vector_store.delete_repository_vectors(repo.id)

        # 2. Clean disk files
        work_dir = os.path.join(settings.STORAGE_PATH, f"repo_{repo.id}")
        if os.path.exists(work_dir):
            shutil.rmtree(work_dir, ignore_errors=True)

        # 3. Clean database records
        await db.delete(repo)
        await db.commit()


repository_service = RepositoryService()
