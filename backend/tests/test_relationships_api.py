"""
Integration tests for relationship API endpoints.
"""
import pytest
from httpx import AsyncClient
from typing import Dict


class TestRelationshipsAPI:
    """Coverage for relationship routes."""

    @pytest.mark.asyncio
    async def test_discover_project_relationships_unauthorized(
        self, api_client: AsyncClient, test_project: Dict
    ):
        """Relationship discovery endpoint should require authentication."""
        response = await api_client.post(
            f"/api/v1/projects/{test_project['id']}/relationships/discover"
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_discover_entity_relationships_unauthorized(
        self, api_client: AsyncClient, test_project: Dict
    ):
        """Entity relationship discovery should require authentication."""
        response = await api_client.post(
            f"/api/v1/projects/{test_project['id']}/entities/relationships/discover",
            json=["507f1f77bcf86cd799439011"],
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_relationship_not_found(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """Fetching missing relationship should return 404."""
        response = await api_client.get(
            "/api/v1/relationships/507f1f77bcf86cd799439011",
            headers=auth_headers,
        )
        assert response.status_code == 404
