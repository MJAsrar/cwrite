"""
Integration tests for research chat API endpoint.
"""
import pytest
from httpx import AsyncClient


class TestResearchAPI:
    """Coverage for research route auth and validation."""

    @pytest.mark.asyncio
    async def test_research_chat_unauthorized(self, api_client: AsyncClient):
        """Research endpoint should require authentication."""
        payload = {
            "message": "How can I improve pacing?",
            "project_id": "507f1f77bcf86cd799439011",
            "max_sources": 3,
        }
        response = await api_client.post("/api/v1/chat/research", json=payload)
        assert response.status_code == 401
