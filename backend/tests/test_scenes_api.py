"""
Integration tests for scene API endpoints.
"""
import pytest
from httpx import AsyncClient
from typing import Dict


class TestScenesAPI:
    """Coverage for scene and timeline routes."""

    @pytest.mark.asyncio
    async def test_get_file_scenes_unauthorized(self, api_client: AsyncClient, test_file: Dict):
        """Scene listing endpoint should require authentication."""
        response = await api_client.get(f"/api/v1/files/{test_file['id']}/scenes")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_file_scenes_invalid_file_id(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """Invalid file ID should be rejected."""
        response = await api_client.get(
            "/api/v1/files/not-an-object-id/scenes",
            headers=auth_headers,
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_get_file_timeline_invalid_file_id(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """Timeline endpoint should validate file IDs."""
        response = await api_client.get(
            "/api/v1/files/not-an-object-id/timeline",
            headers=auth_headers,
        )
        assert response.status_code == 400
