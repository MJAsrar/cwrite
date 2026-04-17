"""
Unit tests for HuggingFaceService.
"""
import pytest
from unittest.mock import AsyncMock

from app.services.huggingface_service import HuggingFaceService


class TestHuggingFaceService:
    """Unit coverage for genre mapping and response generation."""

    def test_get_model_for_unknown_genre_falls_back_to_general(self):
        """Unknown genres should map to the general model."""
        service = HuggingFaceService()
        model = service.get_model_for_genre("unknown-genre")
        assert model == service.get_model_for_genre("general")

    def test_get_available_genres_contains_required_fields(self):
        """Available genres list should expose UI metadata."""
        service = HuggingFaceService()
        genres = service.get_available_genres()

        assert isinstance(genres, list)
        assert len(genres) > 0
        first = genres[0]
        assert set(["id", "label", "emoji", "description", "model"]).issubset(first.keys())

    @pytest.mark.asyncio
    async def test_generate_response_uses_chat_completion_content(self):
        """generate_response should return assistant content from chat completion."""
        service = HuggingFaceService()
        service.chat_completion = AsyncMock(
            return_value={"choices": [{"message": {"role": "assistant", "content": "ok"}}]}
        )

        response = await service.generate_response(
            prompt="hello",
            genre="fantasy",
        )

        assert response == "ok"
        service.chat_completion.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_chat_completion_raises_when_token_missing(self):
        """chat_completion should fail fast without API token."""
        service = HuggingFaceService()
        service.api_token = None

        with pytest.raises(ValueError, match="API token not configured"):
            await service.chat_completion(messages=[{"role": "user", "content": "hi"}])
