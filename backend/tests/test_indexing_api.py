"""
Integration tests for indexing API endpoints.
"""
import pytest
from httpx import AsyncClient
from typing import Dict


class TestIndexingAPI:
    """Coverage for indexing management routes."""

    @pytest.mark.asyncio
    async def test_start_project_reindexing_unauthorized(
        self, api_client: AsyncClient
    ):
        """Reindex endpoint should require authentication."""
        response = await api_client.post(
            "/api/v1/projects/000000000000000000000001/indexing/reindex"
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_project_indexing_status_unauthorized(
        self, api_client: AsyncClient
    ):
        """Indexing status endpoint should require authentication."""
        response = await api_client.get(
            "/api/v1/projects/000000000000000000000001/indexing/status"
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_task_status_unknown_task(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """Unknown indexing task should return not found."""
        response = await api_client.get(
            "/api/v1/tasks/task-does-not-exist",
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_start_relationship_discovery_unauthorized(
        self, api_client: AsyncClient
    ):
        """Relationship discovery endpoint should require authentication."""
        response = await api_client.post(
            "/api/v1/projects/000000000000000000000001/indexing/relationships"
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_start_embedding_generation_unauthorized(
        self, api_client: AsyncClient
    ):
        """Embedding generation endpoint should require authentication."""
        response = await api_client.post(
            "/api/v1/projects/000000000000000000000001/indexing/embeddings"
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_start_cleanup_unauthorized(self, api_client: AsyncClient):
        """Cleanup endpoint should require authentication."""
        response = await api_client.post(
            "/api/v1/projects/000000000000000000000001/indexing/cleanup"
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_cancel_unknown_task(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """Cancelling an unknown task should return not found."""
        response = await api_client.post(
            "/api/v1/tasks/task-does-not-exist/cancel",
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_clear_indexing_history_unauthorized(self, api_client: AsyncClient):
        """Clearing indexing history should require authentication."""
        response = await api_client.delete(
            "/api/v1/projects/000000000000000000000001/indexing/history"
        )
        assert response.status_code == 401
