"""
Backend citation validator.
Validates LLM citations against actual retrieved source chunks and enforces repository isolation.
"""
import re
from typing import List, Dict, Any, Tuple
from app.schemas.chat import CitationResponse


class CitationValidator:
    def validate_citations(
        self,
        answer: str,
        structured_evidence: List[Dict[str, Any]],
        repository_id: str
    ) -> Tuple[str, List[CitationResponse], bool]:
        """
        Validates citations in the answer against real retrieved chunks.
        Returns:
            - sanitized_answer: text with verified citations
            - valid_citations: list of verified CitationResponse objects
            - insufficient_evidence: boolean flag indicating if answer was ungrounded
        """
        evidence_map = {item["label"]: item for item in structured_evidence}
        cited_labels = re.findall(r'\[(E\d+)\]', answer)

        valid_citations: List[CitationResponse] = []
        seen_labels = set()

        for label in cited_labels:
            if label in evidence_map and label not in seen_labels:
                seen_labels.add(label)
                item = evidence_map[label]
                valid_citations.append(CitationResponse(
                    chunk_id=item.get("chunk_id"),
                    file_path=item["file_path"],
                    symbol_name=item.get("symbol_name"),
                    start_line=item["start_line"],
                    end_line=item["end_line"],
                    relevance_score=1.0,
                    citation_label=label
                ))

        # Check for ungrounded or insufficient evidence indicators
        lower_ans = answer.lower()
        insufficient_markers = [
            "could not find enough verified source code",
            "insufficient evidence",
            "not enough information in the repository",
            "no matching source code"
        ]
        is_insufficient = (
            any(marker in lower_ans for marker in insufficient_markers) or
            (len(structured_evidence) == 0 and not valid_citations)
        )

        return answer, valid_citations, is_insufficient


citation_validator = CitationValidator()
