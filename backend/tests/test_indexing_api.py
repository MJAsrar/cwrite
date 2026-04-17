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
        self, api_client: AsyncClient, test_project: Dict
    ):
        """Reindex endpoint should require authentication."""
        response = await api_client.post(
            f"/api/v1/projects/{test_project['id']}/indexing/reindex"
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_project_indexing_status_unauthorized(
        self, api_client: AsyncClient, test_project: Dict
    ):
        """Indexing status endpoint should require authentication."""
        response = await api_client.get(
            f"/api/v1/projects/{test_project['id']}/indexing/status"
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_task_status_unknown_task(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """Unknown indexing task should return not found."""
        response = await api_client.get(
            "/api/v1/indexing/tasks/task-does-not-exist",
            headers=auth_headers,
        )
        assert response.status_code == 404
