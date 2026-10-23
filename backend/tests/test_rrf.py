"""
Unit tests for Reciprocal Rank Fusion (RRF) algorithm.
"""
from app.retrieval.fusion import reciprocal_rank_fusion


def test_rrf_scoring_order():
    # Vector ranked list
    vec_results = [
        ("chunk_1", 0.95, {"title": "Doc 1"}),
        ("chunk_2", 0.85, {"title": "Doc 2"}),
        ("chunk_3", 0.75, {"title": "Doc 3"}),
    ]

    # Lexical ranked list
    lex_results = [
        ("chunk_2", 15.0, {"title": "Doc 2"}),
        ("chunk_4", 10.0, {"title": "Doc 4"}),
        ("chunk_1", 8.0, {"title": "Doc 1"}),
    ]

    # Compute RRF with k=60
    fused = reciprocal_rank_fusion(vec_results, lex_results, k=60)

    # chunk_2 appears at rank 2 in vector (1/62) and rank 1 in lexical (1/61)
    # chunk_1 appears at rank 1 in vector (1/61) and rank 3 in lexical (1/63)
    # 1/62 + 1/61 = 0.016129 + 0.016393 = 0.032522
    # 1/61 + 1/63 = 0.016393 + 0.015873 = 0.032266
    # Therefore chunk_2 should be ranked #1
    assert fused[0][0] == "chunk_2"
    assert fused[1][0] == "chunk_1"
    assert len(fused) == 4
