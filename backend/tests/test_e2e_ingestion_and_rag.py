"""
Comprehensive End-to-End Test for CodeSage AI.
Tests the entire lifecycle:
1. Ingestion of ZIP repository fixture
2. Tree-sitter parsing and line-accurate chunking
3. Hybrid RRF retrieval (vector + lexical)
4. Grounded answer generation and backend citation validation
5. Insufficient evidence detection
6. RAG Evaluation benchmarking (Recall@5 & MRR calculation)
"""
import os
import uuid
import pytest
from sqlalchemy import select
from app.db.session import init_db, AsyncSessionLocal
from app.models.user import User
from app.models.workspace import Workspace
from app.models.repository import Repository
from app.ingestion.archive import extract_zip_archive
from app.ingestion.pipeline import pipeline
from app.retrieval.fusion import retrieve_chunks
from app.retrieval.context import context_builder
from app.llm.provider import ai_provider
from app.llm.prompts import GROUNDED_SYSTEM_PROMPT, format_user_prompt
from app.llm.citations import citation_validator
from app.services.evaluation_service import evaluation_service
from app.schemas.evaluation import EvaluationRunCreate


@pytest.mark.asyncio
async def test_full_codesage_pipeline_lifecycle():
    await init_db()

    async with AsyncSessionLocal() as session:
        # 1. Create User and Workspace
        user = User(
            name="E2E Test Engineer",
            email=f"e2e_{uuid.uuid4().hex[:8]}@codesage.dev",
            password_hash="fakehash"
        )
        session.add(user)
        await session.flush()

        workspace = Workspace(name="E2E Test Workspace", owner_id=user.id)
        session.add(workspace)
        await session.flush()

        # 2. Extract fixture zip to storage
        zip_path = os.path.abspath("fixtures/sample_repo.zip")
        assert os.path.exists(zip_path)

        repo = Repository(
            workspace_id=workspace.id,
            name="Sample Microservice",
            source_type="zip",
            status="pending"
        )
        session.add(repo)
        await session.flush()

        work_dir = os.path.join("./storage", f"repo_{repo.id}")
        extract_zip_archive(zip_path, work_dir)

        # 3. Run Ingestion Pipeline
        success = await pipeline.run_indexing(session, repo.id)
        assert success is True

        # Refresh repo status
        await session.refresh(repo)
        assert repo.status == "ready"
        assert repo.file_count >= 3
        assert repo.chunk_count >= 4
        assert repo.primary_language == "python"

        # 4. Test Hybrid RRF Retrieval
        query = "Where is calculate_order_total implemented?"
        retrieved = await retrieve_chunks(session, repo.id, query, mode="hybrid_rrf", top_k=5)
        assert len(retrieved) > 0

        # Top result must match billing.py containing calculate_order_total
        top_chunk = retrieved[0]
        assert "billing.py" in top_chunk["file_path"]
        assert top_chunk["symbol_name"] == "calculate_order_total"
        assert top_chunk["start_line"] >= 1

        # 5. Test Grounded Chat Synthesis & Citation Validation
        formatted_context, structured_evidence = context_builder.build_evidence_context(retrieved)
        user_prompt = format_user_prompt(query, formatted_context)

        answer = await ai_provider.generate_chat(GROUNDED_SYSTEM_PROMPT, user_prompt)
        assert len(answer) > 0

        sanitized, citations, is_insufficient = citation_validator.validate_citations(
            answer=answer,
            structured_evidence=structured_evidence,
            repository_id=repo.id
        )
        assert is_insufficient is False
        assert len(citations) >= 1
        assert "billing.py" in citations[0].file_path

        # 6. Test Unanswerable Query & Grounded Abstention
        unanswerable_query = "What is the Stripe recurring webhook handler logic?"
        empty_retrieved = []  # simulate zero matching code
        _, empty_evidence = context_builder.build_evidence_context(empty_retrieved)
        unans_prompt = format_user_prompt(unanswerable_query, "No matching source code found.")

        unans_answer = await ai_provider.generate_chat(GROUNDED_SYSTEM_PROMPT, unans_prompt)
        _, _, unans_insufficient = citation_validator.validate_citations(
            answer=unans_answer,
            structured_evidence=empty_evidence,
            repository_id=repo.id
        )
        assert unans_insufficient is True

        # 7. Test RAG Evaluation Benchmark Execution
        dataset = await evaluation_service.get_or_create_default_dataset(session)
        assert dataset is not None

        run_result = await evaluation_service.run_evaluation(
            session,
            EvaluationRunCreate(
                dataset_id=dataset.id,
                repository_id=repo.id,
                configuration_name="hybrid_rrf"
            )
        )
        assert run_result.status == "completed"
        assert run_result.total_questions > 0
        assert run_result.latency_ms >= 0.0
        assert len(run_result.results) == run_result.total_questions
