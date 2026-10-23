"""
Structure-aware code chunking module.
Combines Tree-sitter symbol boundaries with sliding window fallbacks and contextual headers.
"""
import hashlib
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from app.parsing.treesitter import ParsedSymbol, parser_service


@dataclass
class CodeChunkData:
    symbol_name: Optional[str]
    chunk_type: str  # function, class, method, route, doc, block
    start_line: int  # 1-indexed
    end_line: int    # 1-indexed
    chunk_text: str
    context_header: str
    content_hash: str


class CodeChunker:
    def __init__(self, max_chunk_lines: int = 80, window_size: int = 50, window_overlap: int = 10):
        self.max_chunk_lines = max_chunk_lines
        self.window_size = window_size
        self.window_overlap = window_overlap

    def chunk_file(self, content: str, file_path: str, language: str) -> List[CodeChunkData]:
        """
        Creates semantic chunks based on AST symbols, falling back to windowing for gaps.
        """
        lines = content.splitlines(keepends=True)
        total_lines = len(lines)
        if total_lines == 0:
            return []

        symbols, _ = parser_service.parse_file(content, language)
        chunks: List[CodeChunkData] = []
        covered_lines = [False] * (total_lines + 1)

        # 1. Chunk detected symbols (functions, methods, classes)
        for sym in symbols:
            s_start = max(1, sym.start_line)
            s_end = min(total_lines, sym.end_line)
            if s_start > s_end:
                continue

            # Mark lines as covered
            for i in range(s_start, s_end + 1):
                covered_lines[i] = True

            sym_lines = lines[s_start - 1:s_end]
            sym_text = "".join(sym_lines)

            # If symbol is within normal size, create a single chunk
            if (s_end - s_start + 1) <= self.max_chunk_lines:
                header = f"File: {file_path} | Language: {language} | Symbol: {sym.name} ({sym.symbol_type}) | Lines {s_start}-{s_end}"
                content_hash = hashlib.sha256(sym_text.encode("utf-8")).hexdigest()
                chunks.append(CodeChunkData(
                    symbol_name=sym.name,
                    chunk_type=sym.symbol_type,
                    start_line=s_start,
                    end_line=s_end,
                    chunk_text=sym_text,
                    context_header=header,
                    content_hash=content_hash
                ))
            else:
                # Large function/class: split into overlapping sections while preserving signature header
                sig = sym_lines[0].strip() if sym_lines else sym.name
                step = self.window_size - self.window_overlap
                sub_idx = 0
                while s_start + sub_idx < s_end:
                    sub_start = s_start + sub_idx
                    sub_end = min(s_end, sub_start + self.window_size - 1)
                    sub_text = "".join(lines[sub_start - 1:sub_end])
                    header = f"File: {file_path} | Language: {language} | Symbol: {sym.name} ({sym.symbol_type}) [Part] | Context: {sig} | Lines {sub_start}-{sub_end}"
                    content_hash = hashlib.sha256(sub_text.encode("utf-8")).hexdigest()
                    chunks.append(CodeChunkData(
                        symbol_name=sym.name,
                        chunk_type=sym.symbol_type,
                        start_line=sub_start,
                        end_line=sub_end,
                        chunk_text=sub_text,
                        context_header=header,
                        content_hash=content_hash
                    ))
                    if sub_end == s_end:
                        break
                    sub_idx += step

        # 2. Window uncovered gaps (top-level statements, configuration, docs)
        gap_start = None
        for i in range(1, total_lines + 1):
            if not covered_lines[i]:
                if gap_start is None:
                    gap_start = i
            else:
                if gap_start is not None:
                    self._add_gap_chunks(lines, gap_start, i - 1, file_path, language, chunks)
                    gap_start = None

        if gap_start is not None:
            self._add_gap_chunks(lines, gap_start, total_lines, file_path, language, chunks)

        # Sort chunks by start_line
        chunks.sort(key=lambda c: c.start_line)
        return chunks

    def _add_gap_chunks(self, lines: List[str], start: int, end: int, file_path: str, language: str, chunks: List[CodeChunkData]):
        """Splits an uncovered block into windowed chunks."""
        gap_len = end - start + 1
        if gap_len <= 3:
            # Ignore tiny whitespace/comment gaps
            return

        step = max(1, self.window_size - self.window_overlap)
        curr = start
        while curr <= end:
            w_end = min(end, curr + self.window_size - 1)
            raw = "".join(lines[curr - 1:w_end])
            if raw.strip():  # ignore purely blank chunks
                header = f"File: {file_path} | Language: {language} | Type: block | Lines {curr}-{w_end}"
                content_hash = hashlib.sha256(raw.encode("utf-8")).hexdigest()
                chunks.append(CodeChunkData(
                    symbol_name=None,
                    chunk_type="block",
                    start_line=curr,
                    end_line=w_end,
                    chunk_text=raw,
                    context_header=header,
                    content_hash=content_hash
                ))
            if w_end == end:
                break
            curr += step


code_chunker = CodeChunker()
