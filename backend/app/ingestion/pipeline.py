"""
Repository Ingestion Pipeline.
Coordinates cloning/extraction, filtering, secret scanning, Tree-sitter parsing,
chunk generation, embedding generation, and database/vector persistence.
"""
import os
import shutil
import hashlib
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.core.config import settings
from app.models.repository import Repository, IndexJob
from app.models.code_file import CodeFile, FileDependency
from app.models.code_chunk import CodeChunk
from app.ingestion.cloner import clone_repository, IngestionSecurityError
from app.ingestion.archive import extract_zip_archive, ArchiveSecurityError
from app.ingestion.filters import should_index_file, detect_language
from app.ingestion.secrets import is_secret_file, scan_and_redact_secrets
from app.parsing.chunker import code_chunker
from app.parsing.treesitter import parser_service
from app.llm.provider import ai_provider
from app.retrieval.vector import vector_store


class IngestionPipeline:
    async def run_indexing(
        self,
        db: AsyncSession,
        repository_id: str,
        job_id: Optional[str] = None
    ) -> bool:
        """
        Executes complete ingestion pipeline for a repository.
        Updates job status and repository status across all stages.
        """
        stmt = select(Repository).where(Repository.id == repository_id)
        res = await db.execute(stmt)
        repo = res.scalar_one_or_none()
        if not repo:
            return False

        # Find or create IndexJob
        job = None
        if job_id:
            job_stmt = select(IndexJob).where(IndexJob.id == job_id)
            job_res = await db.execute(job_stmt)
            job = job_res.scalar_one_or_none()

        if not job:
            job = IndexJob(
                repository_id=repository_id,
                status="running",
                stage="cloning",
                progress=5
            )
            db.add(job)
            await db.commit()
            await db.refresh(job)

        work_dir = os.path.join(settings.STORAGE_PATH, f"repo_{repository_id}")

        try:
            # 1. CLONING / EXTRACTION STAGE
            repo.status = "cloning"
            job.stage = "cloning"
            job.progress = 10
            await db.commit()

            commit_sha = repo.commit_sha or "local"
            if repo.source_type == "git" and repo.source_url:
                commit_sha = clone_repository(
                    repo_url=repo.source_url,
                    target_dir=work_dir,
                    branch=repo.branch or "main"
                )
                repo.commit_sha = commit_sha
            elif repo.source_type == "zip":
                # Extracted from uploaded zip in work_dir
                commit_sha = repo.commit_sha or hashlib.md5(repo.name.encode()).hexdigest()[:10]
                repo.commit_sha = commit_sha

            # 2. FILTERING STAGE
            repo.status = "filtering"
            job.stage = "filtering"
            job.progress = 25
            await db.commit()

            eligible_files: List[tuple] = []
            for root, _, files in os.walk(work_dir):
                for f in files:
                    full_path = os.path.join(root, f)
                    rel_path = os.path.relpath(full_path, work_dir).replace("\\", "/")
                    file_size = os.path.getsize(full_path)

                    if is_secret_file(rel_path):
                        continue

                    should_idx, _ = should_index_file(rel_path, file_size)
                    if should_idx:
                        eligible_files.append((full_path, rel_path, file_size))

            # 3. PARSING STAGE
            repo.status = "parsing"
            job.stage = "parsing"
            job.progress = 45
            await db.commit()

            # Clear old records if re-indexing (idempotent)
            await db.execute(delete(FileDependency).where(FileDependency.repository_id == repository_id))
            await db.execute(delete(CodeChunk).where(CodeChunk.file_id.in_(
                select(CodeFile.id).where(CodeFile.repository_id == repository_id)
            )))
            await db.execute(delete(CodeFile).where(CodeFile.repository_id == repository_id))
            await vector_store.delete_repository_vectors(repository_id)
            await db.commit()

            created_files = []
            created_chunks = []
            file_path_to_id = {}
            vectors_to_upsert = []

            for full_path, rel_path, file_size in eligible_files:
                try:
                    with open(full_path, "r", encoding="utf-8", errors="replace") as fh:
                        raw_content = fh.read()
                except Exception:
                    continue

                clean_content, _ = scan_and_redact_secrets(raw_content)
                lang = detect_language(rel_path)
                c_hash = hashlib.sha256(clean_content.encode("utf-8")).hexdigest()

                code_file = CodeFile(
                    repository_id=repository_id,
                    path=rel_path,
                    language=lang,
                    content_hash=c_hash,
                    commit_sha=commit_sha,
                    file_size=file_size,
                    content=clean_content  # cached for direct view
                )
                db.add(code_file)
                await db.flush()
                file_path_to_id[rel_path] = code_file.id
                created_files.append((code_file, clean_content, lang, rel_path))

            # 4. CHUNKING & EMBEDDING STAGE
            repo.status = "embedding"
            job.stage = "embedding"
            job.progress = 65
            await db.commit()

            chunks_data = []
            for code_file, content, lang, rel_path in created_files:
                # Chunk file
                file_chunks = code_chunker.chunk_file(content, rel_path, lang)
                for c in file_chunks:
                    db_chunk = CodeChunk(
                        file_id=code_file.id,
                        symbol_name=c.symbol_name,
                        chunk_type=c.chunk_type,
                        start_line=c.start_line,
                        end_line=c.end_line,
                        chunk_text=c.chunk_text,
                        context_header=c.context_header,
                        embedding_model=settings.EMBEDDING_MODEL,
                        content_hash=c.content_hash
                    )
                    db.add(db_chunk)
                    await db.flush()

                    chunks_data.append((db_chunk, c.context_header, rel_path, lang, c.symbol_name, c.chunk_type, c.start_line, c.end_line, c.chunk_text))

                # Extract imports for dependency graph
                _, parsed_imports = parser_service.parse_file(content, lang)
                for imp in parsed_imports:
                    db.add(FileDependency(
                        repository_id=repository_id,
                        source_file_id=code_file.id,
                        target_path=imp.source_path,
                        import_symbol=imp.symbol_name
                    ))

            # Batch generate embeddings
            batch_size = 20
            for i in range(0, len(chunks_data), batch_size):
                batch = chunks_data[i:i + batch_size]
                texts = [f"{item[1]}\n{item[8]}" for item in batch]
                embeddings = await ai_provider.get_embeddings_batch(texts)

                for (db_chunk, ctx_header, rpath, lang, sym, ctype, start_l, end_l, c_text), emb in zip(batch, embeddings):
                    db_chunk.vector_id = db_chunk.id
                    vectors_to_upsert.append({
                        "chunk_id": db_chunk.id,
                        "vector": emb,
                        "payload": {
                            "chunk_id": db_chunk.id,
                            "file_id": db_chunk.file_id,
                            "file_path": rpath,
                            "language": lang,
                            "symbol_name": sym,
                            "chunk_type": ctype,
                            "start_line": start_l,
                            "end_line": end_l,
                            "chunk_text": c_text,
                            "context_header": ctx_header
                        }
                    })

            # Upsert vectors to vector store (Qdrant / local index)
            await vector_store.upsert_chunks(repository_id, vectors_to_upsert)

            # 5. COMPLETION & READY
            repo.status = "ready"
            repo.file_count = len(created_files)
            repo.chunk_count = len(chunks_data)
            repo.error_message = None

            # Detect primary language
            lang_counts = {}
            for _, _, lang, _ in created_files:
                lang_counts[lang] = lang_counts.get(lang, 0) + 1
            if lang_counts:
                repo.primary_language = max(lang_counts.items(), key=lambda x: x[1])[0]

            job.status = "completed"
            job.stage = "ready"
            job.progress = 100
            job.completed_at = datetime.now(timezone.utc)
            job.safe_error_message = None

            await db.commit()
            return True

        except (IngestionSecurityError, ArchiveSecurityError) as sec_err:
            await db.rollback()
            repo.status = "failed"
            repo.error_message = str(sec_err)
            job.status = "failed"
            job.stage = "failed"
            job.error_code = "SECURITY_VIOLATION"
            job.safe_error_message = str(sec_err)
            await db.commit()
            return False
        except Exception as e:
            await db.rollback()
            repo.status = "failed"
            repo.error_message = f"Indexing failed: {str(e)[:200]}"
            job.status = "failed"
            job.stage = "failed"
            job.error_code = "PIPELINE_ERROR"
            job.safe_error_message = "Indexing encountered an internal processing error. Please retry."
            await db.commit()
            return False


pipeline = IngestionPipeline()
