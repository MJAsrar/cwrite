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

    @pytest.mark.asyncio
    async def test_get_line_invalid_file_id(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """Line lookup should validate file IDs."""
        response = await api_client.get(
            "/api/v1/files/not-an-object-id/lines/1",
            headers=auth_headers,
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_get_line_at_position_invalid_file_id(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """Position lookup should validate file IDs."""
        response = await api_client.get(
            "/api/v1/files/not-an-object-id/position/10",
            headers=auth_headers,
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_get_scene_lines_invalid_scene_id(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """Scene line lookup should validate scene IDs."""
        response = await api_client.get(
            "/api/v1/scenes/not-an-object-id/lines",
            headers=auth_headers,
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_search_lines_invalid_file_id(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """Line search should validate file IDs."""
        response = await api_client.get(
            "/api/v1/files/not-an-object-id/search-lines",
            params={"query": "Alice"},
            headers=auth_headers,
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_get_dialogue_lines_invalid_file_id(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """Dialogue line lookup should validate file IDs."""
        response = await api_client.get(
            "/api/v1/files/not-an-object-id/dialogue-lines",
            headers=auth_headers,
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_get_file_entity_mentions_invalid_file_id(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """File mention lookup should validate file IDs."""
        response = await api_client.get(
            "/api/v1/files/not-an-object-id/entity-mentions",
            headers=auth_headers,
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_get_file_entity_mentions_invalid_scene_id(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """Scene filter should validate scene IDs for mention lookup."""
        response = await api_client.get(
            "/api/v1/files/507f1f77bcf86cd799439011/entity-mentions",
            params={"scene_id": "not-an-object-id"},
            headers=auth_headers,
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_get_entities_on_line_invalid_file_id(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """Line entity lookup should validate file IDs."""
        response = await api_client.get(
            "/api/v1/files/not-an-object-id/lines/1/entities",
            headers=auth_headers,
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_get_first_mention_invalid_ids(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """First mention lookup should validate entity and file IDs."""
        response = await api_client.get(
            "/api/v1/entities/not-an-object-id/first-mention",
            params={"file_id": "also-invalid"},
            headers=auth_headers,
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_get_file_stats_invalid_file_id(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """Stats endpoint should validate file IDs."""
        response = await api_client.get(
            "/api/v1/files/not-an-object-id/stats",
            headers=auth_headers,
        )
        assert response.status_code == 400
