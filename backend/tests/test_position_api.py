"""
Integration tests for position index and entity mention endpoints.
"""
import pytest
from httpx import AsyncClient
from typing import Dict


class TestPositionAPI:
    """Coverage for position and mention routes."""

    @pytest.mark.asyncio
    async def test_get_file_lines_unauthorized(self, api_client: AsyncClient, test_file: Dict):
        """Position endpoint should require authentication."""
        response = await api_client.get(f"/api/v1/files/{test_file['id']}/lines")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_file_lines_invalid_file_id(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """Invalid file IDs should be rejected for line lookup."""
        response = await api_client.get(
            "/api/v1/files/not-an-object-id/lines",
            headers=auth_headers,
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_get_entity_mentions_invalid_entity_id(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """Invalid entity IDs should be rejected for mention lookup."""
        response = await api_client.get(
            "/api/v1/entities/not-an-object-id/mentions",
            headers=auth_headers,
        )
        assert response.status_code == 400
