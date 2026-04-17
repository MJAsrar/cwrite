"""
Unit tests for AIChatService model routing behavior.
"""
from datetime import datetime, UTC
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest

from app.models.conversation import ChatRequest, MessageRole
from app.services.ai_chat_service import AIChatService


class TestAIChatService:
    """Unit coverage for model routing and fallback logic."""

    @pytest.mark.asyncio
    async def test_chat_uses_huggingface_for_non_general_genre(self):
        """Non-general genres should use HuggingFace when token is present."""
        conversation = SimpleNamespace(
            id="507f1f77bcf86cd799439011",
            temperature=0.6,
            message_count=0,
        )
        stored_assistant = SimpleNamespace(
            id="507f1f77bcf86cd799439012",
            conversation_id=conversation.id,
            role=MessageRole.ASSISTANT,
            content="HF answer",
            tokens=10,
            model="nbeerbower/mistral-nemo-gutenberg-12B-v4",
            created_at=datetime.now(UTC),
        )

        groq = Mock()
        groq.continue_conversation = AsyncMock(return_value="groq answer")

        hf = Mock()
        hf.api_token = "token"
        hf.chat_completion = AsyncMock(
            return_value={"choices": [{"message": {"content": "HF answer"}}]}
        )
        hf.get_model_for_genre = Mock(return_value="nbeerbower/mistral-nemo-gutenberg-12B-v4")

        rag = Mock()
        rag.assemble_context = AsyncMock(return_value={"chunks": [], "entities": [], "scenes": []})
        rag.format_context_for_llm = Mock(return_value="context")

        conversation_repo = Mock()
        conversation_repo.get_by_id = AsyncMock(return_value=conversation)
        conversation_repo.increment_message_count = AsyncMock()

        message_repo = Mock()
        message_repo.get_latest_messages = AsyncMock(return_value=[])

        project_repo = Mock()
        project_repo.get_by_id = AsyncMock(
            return_value=SimpleNamespace(settings=SimpleNamespace(genre=SimpleNamespace(value="fantasy")))
        )

        service = AIChatService(
            groq_service=groq,
            hf_service=hf,
            rag_service=rag,
            conversation_repo=conversation_repo,
            message_repo=message_repo,
            project_repo=project_repo,
        )
        service._store_message = AsyncMock(
            side_effect=[
                SimpleNamespace(id="507f1f77bcf86cd799439013"),
                stored_assistant,
            ]
        )
        service._generate_conversation_title = AsyncMock()

        response = await service.chat(
            request=ChatRequest(
                message="Who is the protagonist?",
                project_id="507f1f77bcf86cd799439014",
                conversation_id=conversation.id,
            ),
            user_id="507f1f77bcf86cd799439015",
        )

        hf.chat_completion.assert_awaited_once()
        groq.continue_conversation.assert_not_awaited()
        assert response.context_summary["genre"] == "fantasy"
        assert response.context_summary["model_used"] == "nbeerbower/mistral-nemo-gutenberg-12B-v4"

    @pytest.mark.asyncio
    async def test_chat_falls_back_to_groq_when_huggingface_fails(self):
        """When HuggingFace fails, chat should fall back to Groq."""
        conversation = SimpleNamespace(
            id="507f1f77bcf86cd799439021",
            temperature=0.7,
            message_count=1,
        )
        stored_assistant = SimpleNamespace(
            id="507f1f77bcf86cd799439022",
            conversation_id=conversation.id,
            role=MessageRole.ASSISTANT,
            content="Groq fallback answer",
            tokens=12,
            model="llama-3.3-70b-versatile",
            created_at=datetime.now(UTC),
        )

        groq = Mock()
        groq.continue_conversation = AsyncMock(return_value="Groq fallback answer")

        hf = Mock()
        hf.api_token = "token"
        hf.chat_completion = AsyncMock(side_effect=RuntimeError("hf unavailable"))
        hf.get_model_for_genre = Mock(return_value="unused")

        rag = Mock()
        rag.assemble_context = AsyncMock(return_value={"chunks": [], "entities": [], "scenes": []})
        rag.format_context_for_llm = Mock(return_value="context")

        conversation_repo = Mock()
        conversation_repo.get_by_id = AsyncMock(return_value=conversation)
        conversation_repo.increment_message_count = AsyncMock()

        message_repo = Mock()
        message_repo.get_latest_messages = AsyncMock(return_value=[])

        project_repo = Mock()
        project_repo.get_by_id = AsyncMock(
            return_value=SimpleNamespace(settings=SimpleNamespace(genre=SimpleNamespace(value="romance")))
        )

        service = AIChatService(
            groq_service=groq,
            hf_service=hf,
            rag_service=rag,
            conversation_repo=conversation_repo,
            message_repo=message_repo,
            project_repo=project_repo,
        )
        service._store_message = AsyncMock(
            side_effect=[
                SimpleNamespace(id="507f1f77bcf86cd799439023"),
                stored_assistant,
            ]
        )
        service._generate_conversation_title = AsyncMock()

        response = await service.chat(
            request=ChatRequest(
                message="How is the tension building?",
                project_id="507f1f77bcf86cd799439024",
                conversation_id=conversation.id,
            ),
            user_id="507f1f77bcf86cd799439025",
        )

        hf.chat_completion.assert_awaited_once()
        groq.continue_conversation.assert_awaited_once()
        assert response.context_summary["model_used"] == "llama-3.3-70b-versatile"
