"""
SSRF-safe Git repository cloner.
Implements DNS resolution inspection, IP filtering, and shallow repository cloning.
"""
import ipaddress
import os
import shutil
import socket
import subprocess
from urllib.parse import urlparse
from typing import Tuple
from app.core.config import settings


class IngestionSecurityError(Exception):
    pass


def validate_git_url(url: str) -> str:
    """
    Validates Git URL to prevent SSRF and malicious schemes.
    Checks host against allowed hosts and verifies IP address is not private/loopback.
    """
    parsed = urlparse(url)
    if parsed.scheme not in {"https", "http", "git"}:
        raise IngestionSecurityError(f"Unsupported URL scheme '{parsed.scheme}'. Only HTTPS/Git supported.")

    hostname = parsed.hostname
    if not hostname:
        raise IngestionSecurityError("Invalid URL: missing hostname.")

    # Restrict to configured allowed Git hosts if specified
    if settings.ALLOWED_GIT_HOSTS and hostname.lower() not in settings.ALLOWED_GIT_HOSTS:
        raise IngestionSecurityError(
            f"Host '{hostname}' is not in allowed hosts list: {', '.join(settings.ALLOWED_GIT_HOSTS)}"
        )

    # DNS Resolution and SSRF protection
    try:
        resolved_ips = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        raise IngestionSecurityError(f"Unable to resolve host: '{hostname}'")

    for item in resolved_ips:
        ip_str = item[4][0]
        ip = ipaddress.ip_address(ip_str)
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            raise IngestionSecurityError(f"Security violation: Host resolves to prohibited IP address {ip_str}")

    return url


def clone_repository(repo_url: str, target_dir: str, branch: str = "main") -> str:
    """
    Executes shallow clone of the verified repository.
    Returns commit SHA.
    """
    validate_git_url(repo_url)

    if os.path.exists(target_dir):
        shutil.rmtree(target_dir)
    os.makedirs(target_dir, exist_ok=True)

    # Execute git clone --depth 1
    cmd = [
        "git", "clone",
        "--depth", "1",
        "--branch", branch,
        "--single-branch",
        repo_url,
        target_dir
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            # Try without branch in case default is master
            fallback_cmd = ["git", "clone", "--depth", "1", repo_url, target_dir]
            fallback_result = subprocess.run(fallback_cmd, capture_output=True, text=True, timeout=120)
            if fallback_result.returncode != 0:
                raise IngestionSecurityError(f"Git clone failed: {fallback_result.stderr.strip()[:200]}")
    except subprocess.TimeoutExpired:
        raise IngestionSecurityError("Git clone timed out after 120 seconds.")

    # Extract commit SHA
    try:
        sha_result = subprocess.run(
            ["git", "-C", target_dir, "rev-parse", "HEAD"],
            capture_output=True, text=True, timeout=10
        )
        commit_sha = sha_result.stdout.strip() if sha_result.returncode == 0 else "unknown"
    except Exception:
        commit_sha = "unknown"

    return commit_sha
