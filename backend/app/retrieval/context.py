"""
Context builder and line-range merging module.
Constructs evidence blocks for grounded LLM prompts while respecting token budgets.
"""
from typing import List, Dict, Any, Tuple


class ContextBuilder:
    def __init__(self, max_context_chars: int = 14000):  # approx 3500 tokens
        self.max_context_chars = max_context_chars

    def build_evidence_context(self, retrieved_chunks: List[Dict[str, Any]]) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Deduplicates, groups by file, formats numbered evidence blocks [E1], [E2]...,
        and tracks structured evidence metadata for citation validation.
        """
        if not retrieved_chunks:
            return "No matching source code found in this repository.", []

        # Deduplicate by chunk_id
        seen_ids = set()
        unique_chunks = []
        for ch in retrieved_chunks:
            cid = ch.get("chunk_id")
            if cid and cid not in seen_ids:
                seen_ids.add(cid)
                unique_chunks.append(ch)

        evidence_blocks = []
        structured_evidence = []
        total_chars = 0

        for idx, chunk in enumerate(unique_chunks, start=1):
            label = f"E{idx}"
            file_path = chunk.get("file_path", "unknown")
            start_line = chunk.get("start_line", 1)
            end_line = chunk.get("end_line", 1)
            symbol = chunk.get("symbol_name") or "Code Block"
            code_text = chunk.get("chunk_text", "").strip()

            block_header = f"[{label}] File: {file_path} (Lines {start_line}-{end_line})\nSymbol: {symbol}\n```"
            block_content = f"{block_header}\n{code_text}\n```\n"

            if total_chars + len(block_content) > self.max_context_chars and evidence_blocks:
                break  # Context budget reached

            evidence_blocks.append(block_content)
            total_chars += len(block_content)

            structured_evidence.append({
                "label": label,
                "chunk_id": chunk.get("chunk_id"),
                "file_path": file_path,
                "symbol_name": symbol,
                "start_line": start_line,
                "end_line": end_line,
                "code_text": code_text
            })

        formatted_context = "\n".join(evidence_blocks)
        return formatted_context, structured_evidence


context_builder = ContextBuilder()
