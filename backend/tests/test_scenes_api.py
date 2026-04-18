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

    @pytest.mark.asyncio
    async def test_get_scene_by_number_invalid_file_id(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """Scene-by-number endpoint should validate file IDs."""
        response = await api_client.get(
            "/api/v1/files/not-an-object-id/scenes/1",
            headers=auth_headers,
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_get_file_chapters_invalid_file_id(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """Chapter listing should validate file IDs."""
        response = await api_client.get(
            "/api/v1/files/not-an-object-id/chapters",
            headers=auth_headers,
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_get_chapter_scenes_invalid_file_id(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """Chapter scene lookup should validate file IDs."""
        response = await api_client.get(
            "/api/v1/files/not-an-object-id/chapters/1/scenes",
            headers=auth_headers,
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_get_scenes_with_character_invalid_ids(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """Character scene lookup should validate project and entity IDs."""
        response = await api_client.get(
            "/api/v1/projects/not-an-object-id/scenes/by-character/also-invalid",
            headers=auth_headers,
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_update_scene_invalid_scene_id(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """Scene update should validate scene IDs."""
        response = await api_client.patch(
            "/api/v1/scenes/not-an-object-id",
            json={"summary": "Updated summary"},
            headers=auth_headers,
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_get_scene_at_position_invalid_file_id(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """Scene-at-position endpoint should validate file IDs."""
        response = await api_client.get(
            "/api/v1/files/not-an-object-id/scenes/at-position/10",
            headers=auth_headers,
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_get_dialogue_heavy_scenes_invalid_file_id(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """Dialogue-heavy scene endpoint should validate file IDs."""
        response = await api_client.get(
            "/api/v1/files/not-an-object-id/scenes/dialogue-heavy",
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_scenes_by_pov_invalid_file_id(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """POV scene filter should validate file IDs."""
        response = await api_client.get(
            "/api/v1/files/not-an-object-id/scenes/by-pov/first_person",
            headers=auth_headers,
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_get_scenes_by_type_invalid_file_id(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """Type scene filter should validate file IDs."""
        response = await api_client.get(
            "/api/v1/files/not-an-object-id/scenes/by-type/dialogue",
            headers=auth_headers,
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_get_scenes_by_significance_invalid_file_id(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """Significance filter should validate file IDs."""
        response = await api_client.get(
            "/api/v1/files/not-an-object-id/scenes/by-significance/climax",
            headers=auth_headers,
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_get_flashbacks_invalid_file_id(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """Flashback endpoint should validate file IDs."""
        response = await api_client.get(
            "/api/v1/files/not-an-object-id/flashbacks",
            headers=auth_headers,
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_get_pov_shifts_invalid_file_id(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """POV shift endpoint should validate file IDs."""
        response = await api_client.get(
            "/api/v1/files/not-an-object-id/pov-shifts",
            headers=auth_headers,
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_get_emotional_distribution_invalid_file_id(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """Emotional distribution endpoint should validate file IDs."""
        response = await api_client.get(
            "/api/v1/files/not-an-object-id/emotional-distribution",
            headers=auth_headers,
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_get_analysis_summary_invalid_file_id(
        self, api_client: AsyncClient, auth_headers: Dict[str, str]
    ):
        """Analysis summary endpoint should validate file IDs."""
        response = await api_client.get(
            "/api/v1/files/not-an-object-id/analysis-summary",
            headers=auth_headers,
        )
        assert response.status_code == 400
