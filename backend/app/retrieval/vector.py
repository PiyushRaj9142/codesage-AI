"""
Vector storage adapter supporting Qdrant and embedded local vector indexing.
Enforces mandatory repository authorization filter on every query.
"""
import math
from typing import List, Dict, Any, Tuple, Optional
from app.core.config import settings

# In-memory vector cache for local standalone execution or tests
# Structure: { repository_id: [ {"chunk_id": str, "vector": List[float], "payload": dict} ] }
_local_vector_index: Dict[str, List[Dict[str, Any]]] = {}


def _cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    dot = sum(a * b for a, b in zip(vec1, vec2))
    norm1 = math.sqrt(sum(a * a for a in vec1))
    norm2 = math.sqrt(sum(b * b for b in vec2))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot / (norm1 * norm2)


class VectorStoreService:
    def __init__(self):
        self.qdrant_client = None
        self._init_qdrant()

    def _init_qdrant(self):
        if settings.QDRANT_URL:
            try:
                from qdrant_client import QdrantClient
                self.qdrant_client = QdrantClient(
                    url=settings.QDRANT_URL,
                    api_key=settings.QDRANT_API_KEY,
                    timeout=5.0
                )
            except Exception:
                self.qdrant_client = None

    async def upsert_chunks(self, repository_id: str, items: List[Dict[str, Any]]):
        """
        Upserts chunk vectors and metadata payloads.
        Items: list of {"chunk_id": str, "vector": List[float], "payload": dict}
        """
        if not items:
            return

        # Always update local index
        if repository_id not in _local_vector_index:
            _local_vector_index[repository_id] = []
        _local_vector_index[repository_id].extend(items)

        # Upsert to Qdrant if available
        if self.qdrant_client:
            try:
                from qdrant_client.models import PointStruct, VectorParams, Distance
                # Ensure collection exists
                try:
                    self.qdrant_client.get_collection(settings.QDRANT_COLLECTION)
                except Exception:
                    self.qdrant_client.create_collection(
                        collection_name=settings.QDRANT_COLLECTION,
                        vectors_config=VectorParams(size=settings.EMBEDDING_DIMENSION, distance=Distance.COSINE)
                    )

                points = [
                    PointStruct(
                        id=it["chunk_id"],
                        vector=it["vector"],
                        payload={**it["payload"], "repository_id": repository_id}
                    )
                    for it in items
                ]
                self.qdrant_client.upsert(
                    collection_name=settings.QDRANT_COLLECTION,
                    points=points
                )
            except Exception:
                pass  # Fall back to local index

    async def search(self, repository_id: str, query_vector: List[float], limit: int = 30) -> List[Tuple[str, float, Dict[str, Any]]]:
        """
        Searches for top-k similar chunks with mandatory repository_id filter.
        Returns list of (chunk_id, similarity_score, payload).
        """
        if self.qdrant_client:
            try:
                from qdrant_client.models import Filter, FieldCondition, MatchValue
                query_filter = Filter(
                    must=[
                        FieldCondition(
                            key="repository_id",
                            match=MatchValue(value=repository_id)
                        )
                    ]
                )
                search_result = self.qdrant_client.search(
                    collection_name=settings.QDRANT_COLLECTION,
                    query_vector=query_vector,
                    query_filter=query_filter,
                    limit=limit
                )
                return [(hit.id, hit.score, hit.payload or {}) for hit in search_result]
            except Exception:
                pass  # Fall back to local index

        # Local vector index search
        repo_chunks = _local_vector_index.get(repository_id, [])
        scored = []
        for item in repo_chunks:
            score = _cosine_similarity(query_vector, item["vector"])
            scored.append((item["chunk_id"], score, item["payload"]))

        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:limit]

    async def delete_repository_vectors(self, repository_id: str):
        """Removes all vectors for a given repository."""
        if repository_id in _local_vector_index:
            del _local_vector_index[repository_id]

        if self.qdrant_client:
            try:
                from qdrant_client.models import Filter, FieldCondition, MatchValue
                self.qdrant_client.delete(
                    collection_name=settings.QDRANT_COLLECTION,
                    points_selector=Filter(
                        must=[FieldCondition(key="repository_id", match=MatchValue(value=repository_id))]
                    )
                )
            except Exception:
                pass


vector_store = VectorStoreService()
