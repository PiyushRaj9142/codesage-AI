"""
Unit tests for Git SSRF and URL validation.
"""
import pytest
from app.ingestion.cloner import validate_git_url, IngestionSecurityError


def test_allowed_https_urls():
    url = "https://github.com/octocat/Hello-World.git"
    assert validate_git_url(url) == url


def test_blocked_schemes():
    with pytest.raises(IngestionSecurityError, match="Unsupported URL scheme"):
        validate_git_url("file:///etc/passwd")

    with pytest.raises(IngestionSecurityError, match="Unsupported URL scheme"):
        validate_git_url("ftp://malicious.com/repo")


def test_blocked_unauthorized_host():
    with pytest.raises(IngestionSecurityError, match="not in allowed hosts list"):
        validate_git_url("https://malicious-internal-server.corp/repo.git")
