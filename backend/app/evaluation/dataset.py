"""
Standardized RAG evaluation benchmark datasets.
Includes diverse categories: Location (25%), Explanation (25%), Symbol (15%), Cross-file (15%), Bug (10%), Unanswerable (10%).
"""
from typing import List, Dict, Any

STANDARD_BENCHMARK_QUESTIONS: List[Dict[str, Any]] = [
    # Location (25%)
    {
        "question": "Where is the authentication middleware or token verification defined?",
        "category": "location",
        "expected_file_paths": ["app/core/security.py", "app/core/dependencies.py", "auth/jwt.py", "middleware/auth.ts"],
        "is_answerable": True
    },
    {
        "question": "Which file defines the database connection and session management?",
        "category": "location",
        "expected_file_paths": ["app/db/session.py", "db/session.py", "database.py"],
        "is_answerable": True
    },
    {
        "question": "Where is the repository cloning and git validation logic implemented?",
        "category": "location",
        "expected_file_paths": ["app/ingestion/cloner.py", "ingestion/cloner.py"],
        "is_answerable": True
    },
    # Explanation (25%)
    {
        "question": "How does the Reciprocal Rank Fusion (RRF) algorithm combine vector and keyword results?",
        "category": "explanation",
        "expected_file_paths": ["app/retrieval/fusion.py", "retrieval/fusion.py"],
        "is_answerable": True
    },
    {
        "question": "Explain how safe ZIP archive extraction prevents zip bombs and directory traversal.",
        "category": "explanation",
        "expected_file_paths": ["app/ingestion/archive.py", "ingestion/archive.py"],
        "is_answerable": True
    },
    {
        "question": "How does Tree-sitter AST parsing extract functions, classes, and import statements?",
        "category": "explanation",
        "expected_file_paths": ["app/parsing/treesitter.py", "parsing/treesitter.py"],
        "is_answerable": True
    },
    # Symbol and Exact Match (15%)
    {
        "question": "What parameters does the create_access_token function accept and what does it return?",
        "category": "symbol",
        "expected_file_paths": ["app/core/security.py", "core/security.py"],
        "is_answerable": True
    },
    {
        "question": "Find the definition and implementation of reciprocal_rank_fusion.",
        "category": "symbol",
        "expected_file_paths": ["app/retrieval/fusion.py"],
        "is_answerable": True
    },
    # Cross-file flow (15%)
    {
        "question": "Trace how a chat request flows from the API route to retrieval, generation, and citation persistence.",
        "category": "cross_file",
        "expected_file_paths": ["app/api/chat.py", "app/services/chat_service.py", "app/retrieval/fusion.py"],
        "is_answerable": True
    },
    {
        "question": "How does repository ingestion transition through stages from cloning to ready in the database?",
        "category": "cross_file",
        "expected_file_paths": ["app/ingestion/pipeline.py", "app/models/repository.py"],
        "is_answerable": True
    },
    # Bug Investigation (10%)
    {
        "question": "Investigate IngestionSecurityError: Host resolves to prohibited IP address 127.0.0.1",
        "category": "bug",
        "expected_file_paths": ["app/ingestion/cloner.py"],
        "is_answerable": True
    },
    # Unanswerable Questions (10%)
    {
        "question": "How does the Stripe recurring billing webhook handle charge.refunded events?",
        "category": "unanswerable",
        "expected_file_paths": [],
        "is_answerable": False
    },
    {
        "question": "What is the Kubernetes Helm deployment values configuration for production Redis Sentinel cluster?",
        "category": "unanswerable",
        "expected_file_paths": [],
        "is_answerable": False
    }
]
