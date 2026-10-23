"""
RAG Evaluation runner and metric computation service.
Computes Recall@5, Mean Reciprocal Rank (MRR), Citation Accuracy, Abstention Accuracy, and Latency.
"""
import time
import json
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
from app.models.evaluation import EvaluationDataset, EvaluationItem, EvaluationRun, EvaluationResult
from app.models.repository import Repository
from app.schemas.evaluation import (
    EvaluationDatasetResponse, EvaluationRunCreate,
    EvaluationRunResponse, EvaluationResultDetail, EvaluationComparison
)
from app.evaluation.dataset import STANDARD_BENCHMARK_QUESTIONS
from app.retrieval.fusion import retrieve_chunks
from app.retrieval.context import context_builder
from app.llm.provider import ai_provider
from app.llm.prompts import GROUNDED_SYSTEM_PROMPT, format_user_prompt
from app.llm.citations import citation_validator


class EvaluationService:
    async def get_or_create_default_dataset(self, db: AsyncSession) -> EvaluationDataset:
        """Finds or seeds the standard evaluation benchmark dataset."""
        stmt = select(EvaluationDataset).where(EvaluationDataset.name == "CodeSage Standard Benchmark")
        ds = (await db.execute(stmt)).scalar_one_or_none()
        if ds:
            return ds

        ds = EvaluationDataset(
            name="CodeSage Standard Benchmark",
            description="Comprehensive RAG evaluation dataset spanning Location, Explanation, Symbol, Cross-file, Bug, and Unanswerable queries."
        )
        db.add(ds)
        await db.flush()

        for q in STANDARD_BENCHMARK_QUESTIONS:
            item = EvaluationItem(
                dataset_id=ds.id,
                question=q["question"],
                category=q["category"],
                expected_file_paths=json.dumps(q["expected_file_paths"]),
                is_answerable=q["is_answerable"]
            )
            db.add(item)

        await db.commit()
        await db.refresh(ds)
        return ds

    async def list_datasets(self, db: AsyncSession) -> List[EvaluationDatasetResponse]:
        await self.get_or_create_default_dataset(db)
        stmt = select(EvaluationDataset)
        datasets = (await db.execute(stmt)).scalars().all()

        results = []
        for d in datasets:
            count_stmt = select(EvaluationItem).where(EvaluationItem.dataset_id == d.id)
            items = (await db.execute(count_stmt)).scalars().all()
            results.append(EvaluationDatasetResponse(
                id=d.id,
                name=d.name,
                description=d.description,
                item_count=len(items),
                created_at=d.created_at
            ))
        return results

    async def run_evaluation(
        self,
        db: AsyncSession,
        data: EvaluationRunCreate
    ) -> EvaluationRunResponse:
        """
        Executes real evaluation benchmark run against repository and computes true metrics.
        """
        # Fetch repository
        repo = (await db.execute(select(Repository).where(Repository.id == data.repository_id))).scalar_one_or_none()
        if not repo:
            raise HTTPException(status_code=404, detail="Repository not found")

        # Fetch dataset items
        items_stmt = select(EvaluationItem).where(EvaluationItem.dataset_id == data.dataset_id)
        items = (await db.execute(items_stmt)).scalars().all()
        if not items:
            raise HTTPException(status_code=400, detail="Evaluation dataset contains no questions")

        run = EvaluationRun(
            dataset_id=data.dataset_id,
            repository_id=data.repository_id,
            configuration_name=data.configuration_name,
            status="running",
            total_questions=len(items)
        )
        db.add(run)
        await db.commit()
        await db.refresh(run)

        hits_at_5 = 0
        reciprocal_ranks = []
        valid_citation_count = 0
        correct_abstentions = 0
        latencies = []
        result_details: List[EvaluationResultDetail] = []

        for item in items:
            expected_files = json.loads(item.expected_file_paths)
            start_t = time.time()

            # Retrieve chunks using configured retrieval mode
            retrieved = await retrieve_chunks(
                db=db,
                repository_id=data.repository_id,
                query=item.question,
                mode=data.configuration_name,
                top_k=10
            )

            latency_ms = (time.time() - start_t) * 1000
            latencies.append(latency_ms)

            # Evaluate Recall@5 and MRR
            first_rank = 0
            is_hit = False

            if item.is_answerable:
                for rank, ch in enumerate(retrieved, start=1):
                    ch_path = ch.get("file_path", "")
                    if any(exp in ch_path or ch_path.endswith(exp) for exp in expected_files):
                        if first_rank == 0:
                            first_rank = rank
                        if rank <= 5:
                            is_hit = True

                if is_hit:
                    hits_at_5 += 1

                rr = (1.0 / first_rank) if first_rank > 0 else 0.0
                reciprocal_ranks.append(rr)
            else:
                # For unanswerable questions, rank is irrelevant
                rr = 0.0

            # Answer synthesis & citation validation
            formatted_context, structured_evidence = context_builder.build_evidence_context(retrieved)
            user_prompt = format_user_prompt(item.question, formatted_context)

            try:
                gen_answer = await ai_provider.generate_chat(GROUNDED_SYSTEM_PROMPT, user_prompt)
            except Exception:
                gen_answer = "Generation error"

            _, citations, is_insufficient = citation_validator.validate_citations(
                answer=gen_answer,
                structured_evidence=structured_evidence,
                repository_id=data.repository_id
            )

            citation_valid = len(citations) > 0 if item.is_answerable else False
            if citation_valid:
                valid_citation_count += 1

            if not item.is_answerable and is_insufficient:
                correct_abstentions += 1

            eval_res = EvaluationResult(
                run_id=run.id,
                item_id=item.id,
                retrieved_chunks_json=json.dumps([{"path": c.get("file_path"), "lines": [c.get("start_line"), c.get("end_line")]} for c in retrieved[:5]]),
                generated_answer=gen_answer[:500],
                is_hit_at_5=is_hit,
                reciprocal_rank=rr,
                citation_valid=citation_valid,
                latency_ms=latency_ms
            )
            db.add(eval_res)

            result_details.append(EvaluationResultDetail(
                item_id=item.id,
                question=item.question,
                category=item.category,
                is_hit_at_5=is_hit,
                reciprocal_rank=rr,
                citation_valid=citation_valid,
                latency_ms=latency_ms,
                generated_answer=gen_answer[:300]
            ))

        # Calculate summary metrics
        answerable_count = sum(1 for it in items if it.is_answerable)
        unanswerable_count = len(items) - answerable_count

        run.recall_at_5 = (hits_at_5 / answerable_count) if answerable_count > 0 else 0.0
        run.mrr = (sum(reciprocal_ranks) / answerable_count) if answerable_count > 0 else 0.0
        run.citation_accuracy = (valid_citation_count / answerable_count) if answerable_count > 0 else 0.0
        run.abstention_accuracy = (correct_abstentions / unanswerable_count) if unanswerable_count > 0 else 1.0
        run.latency_ms = sum(latencies) / len(latencies) if latencies else 0.0
        run.status = "completed"
        run.answered_questions = len(items)

        await db.commit()
        await db.refresh(run)

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
            results=result_details
        )

    async def list_runs(self, db: AsyncSession, repo_id: Optional[str] = None) -> List[EvaluationRunResponse]:
        stmt = select(EvaluationRun)
        if repo_id:
            stmt = stmt.where(EvaluationRun.repository_id == repo_id)
        stmt = stmt.order_by(EvaluationRun.created_at.desc())
        runs = (await db.execute(stmt)).scalars().all()

        results = []
        for r in runs:
            results.append(EvaluationRunResponse(
                id=r.id,
                dataset_id=r.dataset_id,
                repository_id=r.repository_id,
                configuration_name=r.configuration_name,
                status=r.status,
                recall_at_5=round(r.recall_at_5, 3),
                mrr=round(r.mrr, 3),
                citation_accuracy=round(r.citation_accuracy, 3),
                abstention_accuracy=round(r.abstention_accuracy, 3),
                latency_ms=round(r.latency_ms, 1),
                total_questions=r.total_questions,
                answered_questions=r.answered_questions,
                created_at=r.created_at,
                results=[]
            ))
        return results


evaluation_service = EvaluationService()
