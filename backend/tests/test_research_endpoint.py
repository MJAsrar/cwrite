"""
Unit tests for research endpoint flow.
"""
from datetime import datetime, UTC
from unittest.mock import AsyncMock, Mock, patch

import pytest
from fastapi import HTTPException

from app.api.v1.endpoints.research import research_chat
from app.models.conversation import MessageRole, ResearchRequest
from app.services.web_search_service import SearchResult


class TestResearchEndpoint:
    """Unit tests for the /chat/research endpoint logic."""

    @pytest.mark.asyncio
    async def test_research_chat_success_returns_response_with_sources(self):
        """Endpoint should return synthesized response and mapped sources."""
        request = ResearchRequest(
            message="How can I write realistic dialogue?",
            project_id="project-123",
            max_sources=2,
        )
        current_user = Mock()
        current_user.id = "user-123"

        mock_results = [
            SearchResult(
                title="Dialogue Tips",
                url="https://example.com/dialogue",
                snippet="A" * 250,
                score=0.9,
            ),
            SearchResult(
                title="Character Voice",
                url="https://example.com/voice",
                snippet="Distinct voice helps each speaker feel real.",
                score=0.8,
            ),
        ]

        mock_search_service = Mock()
        mock_search_service.is_available.return_value = True
        mock_search_service.search = AsyncMock(return_value=mock_results)
        mock_search_service.format_results_for_llm.return_value = "formatted results"

        mock_groq_service = Mock()
        mock_groq_service.continue_conversation = AsyncMock(
            return_value="Use subtext and conflict to make dialogue authentic."
        )

        conversation = Mock()
        conversation.id = "conv-1"

        assistant_message = Mock()
        assistant_message.id = "msg-2"
        assistant_message.conversation_id = "conv-1"
        assistant_message.role = MessageRole.ASSISTANT
        assistant_message.content = "Use subtext and conflict to make dialogue authentic."
        assistant_message.tokens = 321
        assistant_message.model = "llama-3.3-70b-versatile"
        assistant_message.created_at = datetime.now(UTC)

        mock_chat_service = Mock()
        mock_chat_service._create_conversation = AsyncMock(return_value=conversation)
        mock_chat_service._store_message = AsyncMock(
            side_effect=[Mock(id="msg-1"), assistant_message]
        )
        mock_chat_service.conversation_repo = Mock()
        mock_chat_service.conversation_repo.increment_message_count = AsyncMock()

        with patch(
            "app.api.v1.endpoints.research.WebSearchService",
            return_value=mock_search_service,
        ), patch(
            "app.api.v1.endpoints.research.GroqService",
            return_value=mock_groq_service,
        ), patch(
            "app.api.v1.endpoints.research.AIChatService",
            return_value=mock_chat_service,
        ):
            response = await research_chat(request=request, current_user=current_user)

        mock_search_service.search.assert_awaited_once_with(
            query=request.message,
            max_results=request.max_sources,
        )
        mock_groq_service.continue_conversation.assert_awaited_once()
        llm_call = mock_groq_service.continue_conversation.await_args.kwargs
        assert llm_call["temperature"] == 0.5
        assert llm_call["max_tokens"] == 2500
        assert "formatted results" in llm_call["messages"][1]["content"]
        assert request.message in llm_call["messages"][1]["content"]

        assert response.conversation_id == "conv-1"
        assert response.search_query == request.message
        assert response.message.id == "msg-2"
        assert response.message.role == "assistant"
        assert len(response.sources) == 2
        assert response.sources[0].title == "Dialogue Tips"
        assert len(response.sources[0].snippet) == 200
        assert response.sources[1].url == "https://example.com/voice"

        mock_chat_service.conversation_repo.increment_message_count.assert_awaited_once_with(
            "conv-1"
        )

    @pytest.mark.asyncio
    async def test_research_chat_returns_503_when_search_unavailable(self):
        """Endpoint should fail with 503 when web search is not configured."""
        request = ResearchRequest(message="test", project_id="project-123")
        current_user = Mock()
        current_user.id = "user-123"

        mock_search_service = Mock()
        mock_search_service.is_available.return_value = False

        with patch(
            "app.api.v1.endpoints.research.WebSearchService",
            return_value=mock_search_service,
        ):
            with pytest.raises(HTTPException) as exc:
                await research_chat(request=request, current_user=current_user)

        assert exc.value.status_code == 503
        assert "Web search service is not configured" in exc.value.detail

    @pytest.mark.asyncio
    async def test_research_chat_wraps_unexpected_errors_as_500(self):
        """Unhandled exceptions should be wrapped into a 500 HTTPException."""
        request = ResearchRequest(message="test", project_id="project-123")
        current_user = Mock()
        current_user.id = "user-123"

        mock_search_service = Mock()
        mock_search_service.is_available.return_value = True
        mock_search_service.search = AsyncMock(side_effect=RuntimeError("boom"))

        with patch(
            "app.api.v1.endpoints.research.WebSearchService",
            return_value=mock_search_service,
        ), patch("app.api.v1.endpoints.research.GroqService"), patch(
            "app.api.v1.endpoints.research.AIChatService"
        ):
            with pytest.raises(HTTPException) as exc:
                await research_chat(request=request, current_user=current_user)

        assert exc.value.status_code == 500
        assert "Research failed: boom" == exc.value.detail
