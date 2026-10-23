"""
Safe ZIP archive extraction module.
Guards against path traversal, symlink attacks, and decompression bombs.
"""
import os
import zipfile
import shutil
from typing import Tuple
from app.core.config import settings


class ArchiveSecurityError(Exception):
    pass


def extract_zip_archive(zip_path: str, extract_to: str) -> Tuple[int, int]:
    """
    Safely extracts a ZIP archive into the target directory.
    Enforces path validation, ignores symlinks, and guards against zip bombs.
    Returns (extracted_files_count, total_uncompressed_bytes).
    """
    if os.path.exists(extract_to):
        shutil.rmtree(extract_to)
    os.makedirs(extract_to, exist_ok=True)

    max_uncompressed_bytes = settings.MAX_REPO_DISK_MB * 1024 * 1024
    max_file_count = settings.MAX_FILE_COUNT * 2  # headroom for extraction

    total_bytes = 0
    extracted_count = 0

    target_dir_abs = os.path.abspath(extract_to)

    with zipfile.ZipFile(zip_path, 'r') as zf:
        infolist = zf.infolist()
        if len(infolist) > max_file_count:
            raise ArchiveSecurityError(f"ZIP contains {len(infolist)} entries, exceeding maximum limit ({max_file_count}).")

        for member in infolist:
            # Check uncompressed size
            total_bytes += member.file_size
            if total_bytes > max_uncompressed_bytes:
                raise ArchiveSecurityError("ZIP archive exceeds maximum uncompressed size limit (potential zip bomb).")

            # Check ratio
            if member.compress_size > 0:
                ratio = member.file_size / member.compress_size
                if ratio > 100:
                    raise ArchiveSecurityError(f"Suspicious compression ratio ({ratio:.1f}) in {member.filename}.")

            # Path traversal guard
            normalized = os.path.normpath(member.filename)
            if normalized.startswith("..") or os.path.isabs(normalized):
                raise ArchiveSecurityError(f"Path traversal detected in archive entry: {member.filename}")

            dest_path = os.path.abspath(os.path.join(extract_to, normalized))
            if not dest_path.startswith(target_dir_abs):
                raise ArchiveSecurityError(f"Entry attempts to escape destination root: {member.filename}")

            # Check symlinks (Unix external attributes)
            is_symlink = (member.external_attr >> 16) & 0o120000 == 0o120000
            if is_symlink:
                continue  # Skip symlink safely

            if member.is_dir():
                os.makedirs(dest_path, exist_ok=True)
            else:
                os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                with zf.open(member) as source, open(dest_path, "wb") as target:
                    shutil.copyfileobj(source, target)
                extracted_count += 1

    return extracted_count, total_bytes
