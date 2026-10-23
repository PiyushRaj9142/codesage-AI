"""
Unit tests for secret scanning and redaction.
"""
from app.ingestion.secrets import scan_and_redact_secrets, is_secret_file


def test_secret_file_detection():
    assert is_secret_file(".env") is True
    assert is_secret_file("config/.env.local") is True
    assert is_secret_file("keys/id_rsa") is True
    assert is_secret_file("server.key") is True
    assert is_secret_file("src/main.py") is False
    assert is_secret_file("README.md") is False


def test_secret_pattern_redaction():
    code = '''
DATABASE_URL = "postgres://admin:SuperSecretPass123@db.example.com/prod"
AWS_KEY = "AKIA1234567890ABCDEF"
API_KEY = "sk-proj-1234567890abcdef1234567890abcdef"
'''
    sanitized, detected = scan_and_redact_secrets(code)

    assert "SuperSecretPass123" not in sanitized
    assert "AKIA1234567890ABCDEF" not in sanitized
    assert "REDACTED" in sanitized
    assert len(detected) >= 2
