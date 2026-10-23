"""
File filtering and language detection module.
Excludes generated folders, minified files, lockfiles, and unsupported binaries.
"""
import os
from typing import Optional, Tuple

EXCLUDED_DIRECTORIES = {
    "node_modules", "vendor", "dist", "build", "out", ".next",
    ".venv", "venv", "env", "__pycache__", ".git", ".github",
    ".idea", ".vscode", "target", "bin", "obj", ".turbo",
    ".npm-cache", ".pytest_cache", ".ruff_cache", "coverage"
}

BINARY_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp",
    ".pdf", ".zip", ".tar", ".gz", ".7z", ".rar",
    ".exe", ".dll", ".so", ".dylib", ".class", ".jar",
    ".woff", ".woff2", ".ttf", ".eot", ".otf",
    ".mp3", ".mp4", ".mov", ".avi", ".wasm", ".pyc"
}

EXTENSION_LANGUAGE_MAP = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".java": "java",
    ".go": "go",
    ".rs": "rust",
    ".cpp": "cpp",
    ".c": "c",
    ".h": "c",
    ".hpp": "cpp",
    ".cs": "csharp",
    ".rb": "ruby",
    ".php": "php",
    ".md": "markdown",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".sql": "sql",
    ".sh": "bash",
}

MAX_FILE_SIZE_BYTES = 1024 * 1024  # 1 MB


def detect_language(path: str) -> str:
    """Detects programming language from file extension."""
    _, ext = os.path.splitext(path.lower())
    return EXTENSION_LANGUAGE_MAP.get(ext, "text")


def should_index_file(rel_path: str, file_size: int) -> Tuple[bool, Optional[str]]:
    """
    Evaluates whether a file should be indexed.
    Returns (should_index, skip_reason).
    """
    parts = rel_path.replace("\\", "/").split("/")
    
    # Check directory exclusion
    for part in parts[:-1]:
        if part in EXCLUDED_DIRECTORIES:
            return False, f"Directory '{part}' is in exclusion list"

    filename = parts[-1]
    _, ext = os.path.splitext(filename.lower())

    # Check binary extensions
    if ext in BINARY_EXTENSIONS:
        return False, f"Binary or media extension '{ext}' skipped"

    # Check minified files
    if filename.endswith(".min.js") or filename.endswith(".min.css"):
        return False, "Minified source file skipped"

    # Check lock files when oversized
    if filename in {"package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock", "Cargo.lock"}:
        if file_size > 100 * 1024:
            return False, "Oversized package lockfile skipped"

    # Check file size
    if file_size > MAX_FILE_SIZE_BYTES:
        return False, f"File size ({file_size} bytes) exceeds limit (1MB)"

    if file_size == 0:
        return False, "Empty file skipped"

    return True, None
