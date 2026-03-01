"""
Research API Endpoint

Handles AI chat interactions augmented with real-time web search.
User prompts are searched on the internet, results are retrieved,
and the AI generates an informed answer citing sources.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
import logging

from ....services.web_search_service import WebSearchService
from ....services.groq_service import GroqService
from ....services.ai_chat_service import AIChatService
from ....models.conversation import (
    ResearchRequest, ResearchResponse, SourceItem,
    MessageResponse, MessageRole
)
from ....core.dependencies import get_current_user
from ....models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()


RESEARCH_SYSTEM_PROMPT = """You are an intelligent research assistant for writers.

You have been provided with real-time web search results relevant to the user's question.
Your job is to:
- Synthesize the information from the search results into a clear, well-structured answer
- Cite the source numbers (e.g. [Source 1], [Source 2]) when referencing specific information
- If the search results don't fully answer the question, say so honestly
- Focus on providing actionable, useful information for a writer
- Keep your tone helpful and conversational

Always base your answer on the provided search results. Do not fabricate information."""


@router.post("/research", response_model=ResearchResponse)
async def research_chat(
    request: ResearchRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Perform web research and generate an AI-synthesized answer.

    1. Searches the web using Tavily API
    2. Formats search results as context
    3. Sends context + user query to Groq LLM
    4. Returns the AI answer along with source links
    """
    try:
        # 1. Initialize services
        search_service = WebSearchService()
        groq_service = GroqService()
        chat_service = AIChatService()

        if not search_service.is_available():
            raise HTTPException(
                status_code=503,
                detail="Web search service is not configured. Please set TAVILY_API_KEY."
            )

        # 2. Search the web
        logger.info(f"Research request from user {current_user.id}: {request.message[:80]}")
        search_results = await search_service.search(
            query=request.message,
            max_results=request.max_sources
        )

        # 3. Format search results as LLM context
        search_context = search_service.format_results_for_llm(search_results)

        # 4. Build LLM messages
        llm_messages = [
            {"role": "system", "content": RESEARCH_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"{search_context}\n\nUser Question: {request.message}\n\nPlease provide a comprehensive answer based on the search results above."
            }
        ]

        # 5. Generate AI response via Groq
        ai_response = await groq_service.continue_conversation(
            messages=llm_messages,
            temperature=0.5,
            max_tokens=2500
        )

        # 6. Store in conversation history (reuse existing chat service)
        conversation = await chat_service._create_conversation(
            user_id=str(current_user.id),
            project_id=request.project_id
        )

        # Store user message
        await chat_service._store_message(
            conversation_id=conversation.id,
            role=MessageRole.USER,
            content=request.message
        )

        # Store assistant message
        assistant_msg = await chat_service._store_message(
            conversation_id=conversation.id,
            role=MessageRole.ASSISTANT,
            content=ai_response,
            context_used={"type": "web_research", "sources_count": len(search_results)},
            model="llama-3.3-70b-versatile"
        )

        await chat_service.conversation_repo.increment_message_count(conversation.id)

        # 7. Build source items
        sources = [
            SourceItem(
                title=r.title,
                url=r.url,
                snippet=r.snippet[:200]
            )
            for r in search_results
        ]

        # 8. Build response
        return ResearchResponse(
            conversation_id=conversation.id,
            message=MessageResponse(
                id=assistant_msg.id,
                conversation_id=assistant_msg.conversation_id,
                role=assistant_msg.role.value,
                content=assistant_msg.content,
                tokens=assistant_msg.tokens,
                model=assistant_msg.model,
                created_at=assistant_msg.created_at
            ),
            sources=sources,
            search_query=request.message
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Research error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Research failed: {str(e)}")
