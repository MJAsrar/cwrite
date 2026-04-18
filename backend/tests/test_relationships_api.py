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

    @pytest.mark.asyncio
    async def test_discover_project_relationships_not_found(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """Discovery should return 404 when project does not exist."""
        response = await api_client.post(
            "/api/v1/projects/507f1f77bcf86cd799439011/relationships/discover",
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_discover_entity_relationships_not_found(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """Entity discovery should return 404 when project does not exist."""
        response = await api_client.post(
            "/api/v1/projects/507f1f77bcf86cd799439011/entities/relationships/discover",
            json=["507f1f77bcf86cd799439012"],
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_project_relationships_unauthorized(self, api_client: AsyncClient):
        """Project relationship list should require authentication."""
        response = await api_client.get(
            "/api/v1/projects/507f1f77bcf86cd799439011/relationships"
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_entity_relationships_unauthorized(self, api_client: AsyncClient):
        """Entity relationship list should require authentication."""
        response = await api_client.get(
            "/api/v1/entities/507f1f77bcf86cd799439011/relationships"
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_entity_network_unauthorized(self, api_client: AsyncClient):
        """Entity network endpoint should require authentication."""
        response = await api_client.get(
            "/api/v1/entities/507f1f77bcf86cd799439011/network"
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_update_relationship_not_found(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """Updating unknown relationship should return 404."""
        response = await api_client.put(
            "/api/v1/relationships/507f1f77bcf86cd799439011",
            json={"strength": 0.8},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_relationship_not_found(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """Deleting unknown relationship should return 404."""
        response = await api_client.delete(
            "/api/v1/relationships/507f1f77bcf86cd799439011",
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_recalculate_relationship_not_found(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """Recalculating unknown relationship should return 404."""
        response = await api_client.post(
            "/api/v1/relationships/507f1f77bcf86cd799439011/recalculate-strength",
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_relationship_statistics_unauthorized(self, api_client: AsyncClient):
        """Relationship statistics endpoint should require authentication."""
        response = await api_client.get(
            "/api/v1/projects/507f1f77bcf86cd799439011/relationships/statistics"
        )
        assert response.status_code == 401
