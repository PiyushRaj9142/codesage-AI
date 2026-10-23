"""
Grounded Chat Service with Server-Sent Events (SSE) streaming and citation verification.
"""
import json
from typing import AsyncGenerator, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.core.config import settings
from app.models.repository import Repository
from app.models.conversation import Conversation, Message, Citation
from app.schemas.chat import ChatRequest, CitationResponse
from app.retrieval.fusion import retrieve_chunks
from app.retrieval.context import context_builder
from app.llm.provider import ai_provider
from app.llm.prompts import GROUNDED_SYSTEM_PROMPT, format_user_prompt
from app.llm.citations import citation_validator


class ChatService:
    async def stream_chat(
        self,
        db: AsyncSession,
        user_id: str,
        request: ChatRequest
    ) -> AsyncGenerator[str, None]:
        """
        Executes grounded retrieval, streams LLM answer deltas via SSE,
        validates citations on the backend, and persists conversation.
        """
        # 1. Verify repository is ready
        repo_stmt = select(Repository).where(Repository.id == request.repository_id)
        repo = (await db.execute(repo_stmt)).scalar_one_or_none()
        if not repo:
            yield f"data: {json.dumps({'event': 'error', 'data': {'detail': 'Repository not found'}})}\n\n"
            return

        if repo.status != "ready":
            yield f"data: {json.dumps({'event': 'error', 'data': {'detail': f'Repository is not ready for questions yet (current status: {repo.status}).'}})}\n\n"
            return

        # 2. Get or create conversation
        conv = None
        if request.conversation_id:
            c_stmt = select(Conversation).where(
                Conversation.id == request.conversation_id,
                Conversation.repository_id == request.repository_id,
                Conversation.user_id == user_id
            )
            conv = (await db.execute(c_stmt)).scalar_one_or_none()

        if not conv:
            conv = Conversation(
                user_id=user_id,
                repository_id=request.repository_id,
                title=request.question[:60]
            )
            db.add(conv)
            await db.commit()
            await db.refresh(conv)

        # Emit conversation ID
        yield f"data: {json.dumps({'event': 'status', 'data': {'conversation_id': conv.id, 'status': 'retrieving'}})}\n\n"

        # 3. Retrieve evidence chunks via Hybrid RRF
        retrieved_chunks = await retrieve_chunks(
            db=db,
            repository_id=request.repository_id,
            query=request.question,
            mode="hybrid_rrf",
            top_k=settings.FINAL_EVIDENCE_COUNT
        )

        # 4. Build evidence context with labeled blocks [E1], [E2]
        formatted_context, structured_evidence = context_builder.build_evidence_context(retrieved_chunks)

        yield f"data: {json.dumps({'event': 'status', 'data': {'status': 'generating', 'evidence_count': len(structured_evidence)}})}\n\n"

        # 5. Build prompt & stream answer
        user_prompt = format_user_prompt(request.question, formatted_context)

        accumulated_tokens = []
        try:
            async for token in ai_provider.generate_chat_stream(GROUNDED_SYSTEM_PROMPT, user_prompt):
                accumulated_tokens.append(token)
                yield f"data: {json.dumps({'event': 'delta', 'data': {'token': token}})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'event': 'error', 'data': {'detail': f'AI generation failed: {str(e)}'}})}\n\n"
            return

        full_answer = "".join(accumulated_tokens)

        # 6. Backend Citation Validation
        sanitized_ans, valid_citations, is_insufficient = citation_validator.validate_citations(
            answer=full_answer,
            structured_evidence=structured_evidence,
            repository_id=request.repository_id
        )

        # 7. Persist messages and citations
        user_msg = Message(
            conversation_id=conv.id,
            role="user",
            content=request.question,
            insufficient_evidence=False
        )
        db.add(user_msg)
        await db.flush()

        assistant_msg = Message(
            conversation_id=conv.id,
            role="assistant",
            content=sanitized_ans,
            insufficient_evidence=is_insufficient
        )
        db.add(assistant_msg)
        await db.flush()

        for c in valid_citations:
            db_cit = Citation(
                message_id=assistant_msg.id,
                chunk_id=c.chunk_id,
                file_path=c.file_path,
                symbol_name=c.symbol_name,
                start_line=c.start_line,
                end_line=c.end_line,
                relevance_score=c.relevance_score,
                citation_label=c.citation_label
            )
            db.add(db_cit)

        await db.commit()

        # 8. Emit final complete event
        yield f"data: {json.dumps({\
            'event': 'complete',\
            'data': {\
                'message_id': assistant_msg.id,\
                'conversation_id': conv.id,\
                'insufficient_evidence': is_insufficient,\
                'citations': [c.model_dump() for c in valid_citations]\
            }\
        })}\n\n"


chat_service = ChatService()
