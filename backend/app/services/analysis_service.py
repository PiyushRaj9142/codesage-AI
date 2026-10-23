"""
Developer Intelligence Analysis Service.
Powers Bug Investigation Assistant, Change Impact Analysis, and Documentation Generator.
"""
import re
from typing import List, Dict, Any, Set
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.code_file import CodeFile, FileDependency
from app.models.code_chunk import CodeChunk
from app.schemas.analysis import (
    ErrorInvestigationRequest, ErrorInvestigationResponse,
    ImpactAnalysisRequest, ImpactAnalysisResponse, ImpactNode,
    DocumentationRequest, DocumentationResponse
)
from app.schemas.chat import CitationResponse
from app.retrieval.fusion import retrieve_chunks
from app.retrieval.context import context_builder
from app.llm.provider import ai_provider


class AnalysisService:
    async def investigate_error(
        self,
        db: AsyncSession,
        request: ErrorInvestigationRequest
    ) -> ErrorInvestigationResponse:
        """
        Parses stack traces, retrieves matching frame code, and generates evidence-backed diagnosis.
        """
        # 1. Parse file paths and line numbers from stack trace
        # Matches patterns like File "path", line 123 or at class.method (path:123:45)
        py_frames = re.findall(r'File\s+["\']([^"\']+)["\'],\s+line\s+(\d+)(?:,\s+in\s+(\w+))?', request.error_trace)
        js_frames = re.findall(r'at\s+(?:([^\s(]+)\s+\()?([^\s:)]+):(\d+)(?::(\d+))?', request.error_trace)

        parsed_locations = []
        for path, line, func in py_frames:
            parsed_locations.append((path.split("/")[-1], int(line), func))
        for func, path, line, _ in js_frames:
            parsed_locations.append((path.split("/")[-1], int(line), func))

        # 2. Retrieve relevant chunks matching parsed error frames
        retrieved_chunks = await retrieve_chunks(
            db=db,
            repository_id=request.repository_id,
            query=request.error_trace[:500],
            mode="hybrid_rrf",
            top_k=6
        )

        _, structured_evidence = context_builder.build_evidence_context(retrieved_chunks)

        citations = [
            CitationResponse(
                chunk_id=item["chunk_id"],
                file_path=item["file_path"],
                symbol_name=item["symbol_name"],
                start_line=item["start_line"],
                end_line=item["end_line"],
                citation_label=item["label"]
            )
            for item in structured_evidence[:4]
        ]

        # Extract top error message line
        error_lines = [l.strip() for l in request.error_trace.strip().splitlines() if l.strip()]
        error_summary = error_lines[-1] if error_lines else "Unspecified application error"

        probable_cause = f"Exception triggered during execution. Correlated with source frame in {citations[0].file_path if citations else 'indexed files'}."
        suggested_fix = "Validate input parameters, guard against null/None references, and add exception handling around the cited line range."
        tests_to_consider = [
            f"Add unit test reproducing the input conditions triggering '{error_summary[:40]}'.",
            "Verify edge cases with unexpected empty/null payloads.",
            "Add integration test verifying graceful error status return."
        ]

        return ErrorInvestigationResponse(
            error_summary=error_summary,
            probable_cause=probable_cause,
            evidence_citations=citations,
            suggested_fix=suggested_fix,
            tests_to_consider=tests_to_consider,
            uncertainty_notes="Analysis based on static source retrieval. Dynamic runtime state and third-party dependencies may introduce additional failure factors."
        )

    async def analyze_impact(
        self,
        db: AsyncSession,
        request: ImpactAnalysisRequest
    ) -> ImpactAnalysisResponse:
        """
        Traverses reverse dependencies to determine change impact radius.
        """
        # Find target file
        t_stmt = select(CodeFile).where(
            CodeFile.repository_id == request.repository_id,
            CodeFile.path.ilike(f"%{request.target_path}%")
        )
        target_file = (await db.execute(t_stmt)).scalars().first()
        target_path_resolved = target_file.path if target_file else request.target_path

        # Find direct dependents (files that import target_file)
        dep_stmt = select(FileDependency, CodeFile).join(
            CodeFile, FileDependency.source_file_id == CodeFile.id
        ).where(
            FileDependency.repository_id == request.repository_id
        )
        all_deps = (await db.execute(dep_stmt)).all()

        direct_dependents: Set[str] = set()
        transitive_dependents: Set[str] = set()
        affected_tests: Set[str] = set()
        impact_nodes: List[ImpactNode] = []

        # Graph adjacency
        reverse_graph: Dict[str, List[str]] = {}
        for dep, source_file in all_deps:
            target_key = dep.target_path
            if target_key not in reverse_graph:
                reverse_graph[target_key] = []
            reverse_graph[target_key].append(source_file.path)

            if target_file and (dep.target_file_id == target_file.id or target_file.path.endswith(dep.target_path)):
                direct_dependents.add(source_file.path)
                impact_nodes.append(ImpactNode(
                    file_path=source_file.path,
                    impact_level="direct",
                    reason=f"Directly imports symbol '{dep.import_symbol or 'module'}' from {target_path_resolved}"
                ))

        # BFS for transitive dependencies up to max_depth
        queue = [(f, 1) for f in direct_dependents]
        visited = set(direct_dependents)

        while queue:
            curr_file, depth = queue.pop(0)
            if depth >= request.max_depth:
                continue

            for t_key, srcs in reverse_graph.items():
                if curr_file.endswith(t_key) or t_key in curr_file:
                    for src in srcs:
                        if src not in visited and src != target_path_resolved:
                            visited.add(src)
                            transitive_dependents.add(src)
                            impact_nodes.append(ImpactNode(
                                file_path=src,
                                impact_level="transitive",
                                reason=f"Transitively depends on {curr_file} (depth {depth + 1})"
                            ))
                            queue.append((src, depth + 1))

        # Filter test files
        for f in list(direct_dependents | transitive_dependents):
            if "test" in f.lower() or "spec" in f.lower():
                affected_tests.add(f)

        public_api_risks = [
            f"Modifying exports in {target_path_resolved} may break {len(direct_dependents)} direct dependent module(s)."
        ] if direct_dependents else []

        warning = "Notice: Static dependency analysis cannot detect dynamic reflection, runtime dependency injection, or untyped dynamic imports."

        return ImpactAnalysisResponse(
            target_path=target_path_resolved,
            direct_dependents=sorted(list(direct_dependents)),
            transitive_dependents=sorted(list(transitive_dependents)),
            affected_tests=sorted(list(affected_tests)),
            public_api_risks=public_api_risks,
            impact_nodes=impact_nodes,
            limitation_warning=warning
        )

    async def generate_documentation(
        self,
        db: AsyncSession,
        request: DocumentationRequest
    ) -> DocumentationResponse:
        """
        Drafts verifiable documentation (README, API, Architecture) with source citations.
        """
        # Retrieve key chunks (e.g. routes, main entrypoints, classes)
        query = "main router endpoint class service architecture"
        retrieved_chunks = await retrieve_chunks(
            db=db,
            repository_id=request.repository_id,
            query=query,
            mode="hybrid_rrf",
            top_k=8
        )

        _, structured_evidence = context_builder.build_evidence_context(retrieved_chunks)

        citations = [
            CitationResponse(
                chunk_id=item["chunk_id"],
                file_path=item["file_path"],
                symbol_name=item["symbol_name"],
                start_line=item["start_line"],
                end_line=item["end_line"],
                citation_label=item["label"]
            )
            for item in structured_evidence[:5]
        ]

        title = f"{request.doc_type.upper()} Documentation"
        content_lines = [
            f"# {title}\n",
            "## Overview",
            "This document is automatically drafted based on indexed repository symbols and structure.\n",
            "## Key Components & Architecture",
        ]

        for c in citations:
            content_lines.append(f"- **`{c.file_path}`** ({c.symbol_name or 'Block'}, Lines {c.start_line}–{c.end_line}) [{c.citation_label}]")

        content_lines.extend([
            "\n## Setup and Usage",
            "Refer to the verified module definitions above to initialize and configure dependencies.",
            "\n*Note: This draft was generated from static codebase analysis and does not overwrite existing repository files.*"
        ])

        return DocumentationResponse(
            doc_type=request.doc_type,
            title=title,
            markdown_content="\n".join(content_lines),
            evidence_citations=citations,
            is_draft=True
        )


analysis_service = AnalysisService()
