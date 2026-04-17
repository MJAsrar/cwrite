"""
Integration tests for genres API endpoint.
"""
import pytest
from httpx import AsyncClient


class TestGenresAPI:
    """Coverage for genre listing route."""

    @pytest.mark.asyncio
    async def test_list_genres_returns_non_empty_metadata(self, api_client: AsyncClient):
        """Genres endpoint should return metadata for available genres."""
        response = await api_client.get("/api/v1/genres/")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        sample = data[0]
        assert "id" in sample
        assert "label" in sample
        assert "emoji" in sample
        assert "description" in sample
        assert "model" in sample
