"""
Keyword and symbol lexical retrieval service.
Extracts technical identifiers, camelCase and snake_case tokens, and performs lexical ranking.
"""
import re
from typing import List, Tuple, Dict, Any, Set
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.models.code_chunk import CodeChunk
from app.models.code_file import CodeFile


def extract_search_terms(query: str) -> List[str]:
    """Splits query into exact technical identifiers, words, and sub-tokens."""
    # Quoted tokens
    quoted = re.findall(r'["\']([^"\']+)["\']', query)
    
    # CamelCase and snake_case splitting
    raw_tokens = re.findall(r'[A-Za-z0-9_\-\./]+', query)
    all_terms: Set[str] = set()
    
    for t in raw_tokens:
        clean = t.strip(".,;:()[]{}\"'")
        if len(clean) >= 2:
            all_terms.add(clean.lower())
            # Split camelCase
            camel_split = re.sub(r'([a-z])([A-Z])', r'\1 \2', clean).lower().split()
            if len(camel_split) > 1:
                all_terms.update(camel_split)
            # Split snake_case
            if "_" in clean:
                all_terms.update([p for p in clean.lower().split("_") if len(p) >= 2])

    for q in quoted:
        all_terms.add(q.lower())

    return list(all_terms)


async def lexical_search(
    db: AsyncSession,
    repository_id: str,
    query: str,
    limit: int = 30
) -> List[Tuple[str, float, Dict[str, Any]]]:
    """
    Performs database lexical search over symbol names, file paths, and chunk content.
    Returns list of (chunk_id, lexical_score, payload).
    """
    terms = extract_search_terms(query)
    if not terms:
        return []

    # Build query joining CodeChunk and CodeFile
    stmt = (
        select(CodeChunk, CodeFile)
        .join(CodeFile, CodeChunk.file_id == CodeFile.id)
        .where(CodeFile.repository_id == repository_id)
    )

    result = await db.execute(stmt)
    rows = result.all()

    scored = []
    for chunk, code_file in rows:
        score = 0.0
        text_lower = chunk.chunk_text.lower()
        sym_lower = (chunk.symbol_name or "").lower()
        path_lower = code_file.path.lower()

        for term in terms:
            # Exact symbol name match gets heavy weight
            if sym_lower == term:
                score += 10.0
            elif term in sym_lower:
                score += 5.0

            # File path match
            if term in path_lower:
                score += 4.0

            # Content occurrences
            occurrences = text_lower.count(term)
            if occurrences > 0:
                score += min(3.0, occurrences * 0.5)

        if score > 0:
            payload = {
                "chunk_id": chunk.id,
                "file_path": code_file.path,
                "language": code_file.language,
                "symbol_name": chunk.symbol_name,
                "chunk_type": chunk.chunk_type,
                "start_line": chunk.start_line,
                "end_line": chunk.end_line,
                "chunk_text": chunk.chunk_text,
                "context_header": chunk.context_header
            }
            scored.append((chunk.id, score, payload))

    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[:limit]
