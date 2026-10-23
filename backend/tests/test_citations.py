"""
Unit tests for citation validation and ungrounded response rejection.
"""
from app.llm.citations import citation_validator


def test_valid_citation_extraction():
    structured_evidence = [
        {
            "label": "E1",
            "chunk_id": "chunk-101",
            "file_path": "src/auth/jwt.py",
            "symbol_name": "verify_token",
            "start_line": 15,
            "end_line": 35
        },
        {
            "label": "E2",
            "chunk_id": "chunk-102",
            "file_path": "src/routes/auth.py",
            "symbol_name": "login_handler",
            "start_line": 50,
            "end_line": 75
        }
    ]

    answer = "The JWT validation is handled by [E1], while endpoint routing occurs in [E2]."
    sanitized, citations, is_insufficient = citation_validator.validate_citations(
        answer=answer,
        structured_evidence=structured_evidence,
        repository_id="repo-1"
    )

    assert is_insufficient is False
    assert len(citations) == 2
    assert citations[0].file_path == "src/auth/jwt.py"
    assert citations[0].start_line == 15
    assert citations[1].file_path == "src/routes/auth.py"


def test_insufficient_evidence_flagging():
    structured_evidence = []
    answer = "I could not find enough verified source code to answer this question confidently. Try a more specific symbol."

    sanitized, citations, is_insufficient = citation_validator.validate_citations(
        answer=answer,
        structured_evidence=structured_evidence,
        repository_id="repo-1"
    )

    assert is_insufficient is True
    assert len(citations) == 0
