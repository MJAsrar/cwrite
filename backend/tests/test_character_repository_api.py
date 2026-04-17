"""
Integration tests for character repository endpoints
"""
import pytest
from httpx import AsyncClient
from typing import Dict
import asyncio


class TestCharacterRepositoryAPI:
    """Test suite for character repository API behavior"""

    @pytest.mark.asyncio
    async def test_list_project_entities_returns_character_profiles(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str],
        test_project: Dict,
        test_file: Dict
    ):
        """Test entities endpoint returns project-linked character data."""
        await asyncio.sleep(3)

        response = await api_client.get(
            f"/api/v1/relationships/projects/{test_project['id']}/entities",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        if len(data) > 0:
            entity = data[0]
            assert "id" in entity
            assert "project_id" in entity
            assert "type" in entity
            assert "name" in entity
            assert entity["project_id"] == test_project["id"]

    @pytest.mark.asyncio
    async def test_list_project_entities_character_type_filter(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str],
        test_project: Dict,
        test_file: Dict
    ):
        """Test entity type filter returns only character profiles."""
        await asyncio.sleep(3)

        response = await api_client.get(
            f"/api/v1/relationships/projects/{test_project['id']}/entities?entity_type=character",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        for entity in data:
            assert entity["type"] == "character"

    @pytest.mark.asyncio
    async def test_list_project_entities_unauthorized(self, api_client: AsyncClient, test_project: Dict):
        """Test entities endpoint requires authentication."""
        response = await api_client.get(
            f"/api/v1/relationships/projects/{test_project['id']}/entities"
        )

        assert response.status_code == 401
