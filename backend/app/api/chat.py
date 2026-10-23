"""
Chat API endpoints supporting Server-Sent Events (SSE).
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.core.dependencies import get_current_user, verify_repository_access
from app.models.user import User
from app.models.conversation import Conversation, Message, Citation
from app.schemas.chat import (
    ChatRequest, ConversationResponse, MessageResponse, CitationResponse
)
from app.services.chat_service import chat_service

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("")
async def create_chat_stream(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submits a natural-language question against an indexed repository.
    Streams grounded response tokens and validated citations via SSE.
    """
    await verify_repository_access(request.repository_id, current_user, db, min_role="viewer")
    
    return StreamingResponse(
        chat_service.stream_chat(db, current_user.id, request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/conversations", response_model=List[ConversationResponse])
async def list_conversations(
    repository_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists conversation history strictly for the selected repository."""
    await verify_repository_access(repository_id, current_user, db, min_role="viewer")
    
    stmt = (
        select(Conversation)
        .where(
            Conversation.repository_id == repository_id,
            Conversation.user_id == current_user.id
        )
        .order_by(Conversation.updated_at.desc())
    )
    convs = (await db.execute(stmt)).scalars().all()
    
    results = []
    for c in convs:
        # Load messages
        m_stmt = select(Message).where(Message.conversation_id == c.id).order_by(Message.created_at.asc())
        messages = (await db.execute(m_stmt)).scalars().all()
        
        m_responses = []
        for m in messages:
            c_stmt = select(Citation).where(Citation.message_id == m.id)
            cits = (await db.execute(c_stmt)).scalars().all()
            m_responses.append(MessageResponse(
                id=m.id,
                conversation_id=m.conversation_id,
                role=m.role,
                content=m.content,
                insufficient_evidence=m.insufficient_evidence,
                citations=[CitationResponse.model_validate(cit) for cit in cits],
                created_at=m.created_at
            ))

        results.append(ConversationResponse(
            id=c.id,
            repository_id=c.repository_id,
            title=c.title,
            summary=c.summary,
            created_at=c.created_at,
            updated_at=c.updated_at,
            messages=m_responses
        ))
    return results


@router.get("/conversations/{id}", response_model=ConversationResponse)
async def get_conversation(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves full conversation with messages and verified citations."""
    c_stmt = select(Conversation).where(Conversation.id == id, Conversation.user_id == current_user.id)
    conv = (await db.execute(c_stmt)).scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    m_stmt = select(Message).where(Message.conversation_id == conv.id).order_by(Message.created_at.asc())
    messages = (await db.execute(m_stmt)).scalars().all()

    m_responses = []
    for m in messages:
        c_stmt = select(Citation).where(Citation.message_id == m.id)
        cits = (await db.execute(c_stmt)).scalars().all()
        m_responses.append(MessageResponse(
            id=m.id,
            conversation_id=m.conversation_id,
            role=m.role,
            content=m.content,
            insufficient_evidence=m.insufficient_evidence,
            citations=[CitationResponse.model_validate(cit) for cit in cits],
            created_at=m.created_at
        ))

    return ConversationResponse(
        id=conv.id,
        repository_id=conv.repository_id,
        title=conv.title,
        summary=conv.summary,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=m_responses
    )


@router.delete("/conversations/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deletes conversation history."""
    c_stmt = select(Conversation).where(Conversation.id == id, Conversation.user_id == current_user.id)
    conv = (await db.execute(c_stmt)).scalar_one_or_none()
    if conv:
        await db.delete(conv)
        await db.commit()
