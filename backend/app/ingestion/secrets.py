"""
Secret scanning and pattern detection module.
Excludes and redacts credential-bearing files and sensitive tokens.
"""
import re
from typing import Tuple, List

# Known sensitive filenames
SENSITIVE_FILENAMES = {
    ".env", ".env.local", ".env.production", ".env.staging",
    "id_rsa", "id_dsa", "id_ecdsa", "id_ed25519",
    "id_rsa.pub", "authorized_keys",
    "credentials.json", "service-account.json", "service_account.json",
    "client_secret.json", "private_key.pem", "server.key"
}

# Regex patterns for sensitive credentials
SECRET_PATTERNS = [
    (re.compile(r'(?i)(api[_-]?key|access[_-]?token|secret[_-]?key|auth[_-]?token)\s*[:=]\s*["\']([a-zA-Z0-9_\-\.]{16,})["\']'), "API Key/Token"),
    (re.compile(r'AKIA[0-9A-Z]{16}'), "AWS Access Key ID"),
    (re.compile(r'(?i)ghp_[0-9a-zA-Z]{36}'), "GitHub Personal Access Token"),
    (re.compile(r'(?i)xox[baprs]-[0-9a-zA-Z]{10,48}'), "Slack Token"),
    (re.compile(r'-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----'), "Private Key Header"),
    (re.compile(r'(?i)(postgres|mysql|mongodb|redis)://[^:]+:([^@]+)@'), "Database Connection String Password")
]


def is_secret_file(filename: str) -> bool:
    """Checks if the filename matches known secret/credential filenames."""
    base = filename.split("/")[-1].lower()
    return base in SENSITIVE_FILENAMES or base.endswith(".pem") or base.endswith(".key")


def scan_and_redact_secrets(content: str) -> Tuple[str, List[str]]:
    """
    Scans content for secrets and redacts them with [REDACTED_SECRET].
    Returns (sanitized_content, detected_secret_types).
    """
    detected_types = []
    sanitized = content

    for pattern, secret_type in SECRET_PATTERNS:
        matches = pattern.findall(sanitized)
        if matches:
            detected_types.append(secret_type)
            # Redact occurrences
            sanitized = pattern.sub(f"/* [REDACTED_{secret_type.upper().replace(' ', '_')}] */", sanitized)

    return sanitized, detected_types
