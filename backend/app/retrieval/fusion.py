"""
Reciprocal Rank Fusion (RRF) and hybrid retrieval orchestrator.
Merges dense vector semantic results with sparse lexical keyword matches.
"""
from typing import List, Dict, Any, Tuple
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.llm.provider import ai_provider
from app.retrieval.vector import vector_store
from app.retrieval.keyword import lexical_search


def reciprocal_rank_fusion(
    vector_results: List[Tuple[str, float, Dict[str, Any]]],
    lexical_results: List[Tuple[str, float, Dict[str, Any]]],
    k: int = 60
) -> List[Tuple[str, float, Dict[str, Any]]]:
    """
    Computes Reciprocal Rank Fusion scores across dense and lexical ranked candidate lists.
    RRF_score(d) = sum(1 / (k + rank(d)))
    """
    scores: Dict[str, float] = {}
    payloads: Dict[str, Dict[str, Any]] = {}

    # Rank dense vector results (1-indexed)
    for rank, (chunk_id, _, payload) in enumerate(vector_results, start=1):
        scores[chunk_id] = scores.get(chunk_id, 0.0) + (1.0 / (k + rank))
        if chunk_id not in payloads:
            payloads[chunk_id] = payload

    # Rank lexical keyword results (1-indexed)
    for rank, (chunk_id, _, payload) in enumerate(lexical_results, start=1):
        scores[chunk_id] = scores.get(chunk_id, 0.0) + (1.0 / (k + rank))
        if chunk_id not in payloads:
            payloads[chunk_id] = payload

    # Sort candidates by combined RRF score
    sorted_items = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return [(chunk_id, score, payloads[chunk_id]) for chunk_id, score in sorted_items]


async def retrieve_chunks(
    db: AsyncSession,
    repository_id: str,
    query: str,
    mode: str = "hybrid_rrf",
    top_k: int = 10
) -> List[Dict[str, Any]]:
    """
    Retrieves and ranks relevant code chunks using the requested mode:
    - 'hybrid_rrf': Parallel vector + lexical search fused with RRF
    - 'vector_only': Dense vector search
    - 'keyword_only': Lexical search
    - 'hybrid_rerank': Hybrid RRF with symbol & path match boost
    """
    # Run in parallel if hybrid
    if mode in {"hybrid_rrf", "hybrid_rerank"}:
        async def fetch_vector():
            query_vector = await ai_provider.get_embedding(query)
            return await vector_store.search(repository_id, query_vector, limit=settings.VECTOR_CANDIDATE_COUNT)

        async def fetch_lexical():
            return await lexical_search(db, repository_id, query, limit=settings.KEYWORD_CANDIDATE_COUNT)

        vec_res, lex_res = await asyncio.gather(fetch_vector(), fetch_lexical())
        fused = reciprocal_rank_fusion(vec_res, lex_res, k=settings.RRF_K)

        if mode == "hybrid_rerank":
            # Apply rerank boost for exact symbol mentions or exact file paths in query
            reranked = []
            q_lower = query.lower()
            for chunk_id, score, payload in fused:
                boost = 1.0
                sym = (payload.get("symbol_name") or "").lower()
                path = (payload.get("file_path") or "").lower()
                if sym and sym in q_lower:
                    boost += 0.5
                if path and path in q_lower:
                    boost += 0.3
                reranked.append((chunk_id, score * boost, payload))
            reranked.sort(key=lambda x: x[1], reverse=True)
            fused = reranked

        return [payload for _, _, payload in fused[:top_k]]

    elif mode == "vector_only":
        query_vector = await ai_provider.get_embedding(query)
        vec_res = await vector_store.search(repository_id, query_vector, limit=top_k)
        return [payload for _, _, payload in vec_res]

    elif mode == "keyword_only":
        lex_res = await lexical_search(db, repository_id, query, limit=top_k)
        return [payload for _, _, payload in lex_res]

    else:
        # Default to hybrid
        return await retrieve_chunks(db, repository_id, query, mode="hybrid_rrf", top_k=top_k)
