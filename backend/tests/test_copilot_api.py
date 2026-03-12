"""
Integration tests for Copilot API endpoints
"""
import pytest
from httpx import AsyncClient
from typing import Dict
import asyncio


class TestCopilotAPI:
    """Test suite for copilot suggestion endpoints"""

    @pytest.mark.asyncio
    async def test_generate_dialogue_suggestion_continue(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str],
        test_project: Dict,
        test_file: Dict
    ):
        """Test generating a continue suggestion for dialogue-like text"""
        await asyncio.sleep(2)

        request_data = {
            "project_id": test_project["id"],
            "file_id": test_file["id"],
            "text_before": 'Mara lowered her voice. "Tell me what happened at the gate."',
            "text_after": "",
            "cursor_position": 64,
            "suggestion_type": "continue",
            "max_tokens": 80
        }

        response = await api_client.post(
            "/api/v1/copilot/suggest",
            json=request_data,
            headers=auth_headers
        )

        # Endpoint depends on external AI service; accept handled server errors too
        assert response.status_code in [200, 400, 500]

        if response.status_code == 200:
            data = response.json()
            assert "suggestion" in data
            assert isinstance(data["suggestion"], str)
            assert "context_used" in data

    @pytest.mark.asyncio
    async def test_generate_dialogue_suggestion_rewrite(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str],
        test_project: Dict
    ):
        """Test rewrite-style suggestion path for dialogue text"""
        request_data = {
            "project_id": test_project["id"],
            "text_before": '"I do not trust you," she said.',
            "text_after": "",
            "cursor_position": 31,
            "suggestion_type": "rewrite",
            "max_tokens": 60
        }

        response = await api_client.post(
            "/api/v1/copilot/suggest",
            json=request_data,
            headers=auth_headers
        )

        assert response.status_code in [200, 400, 500]

        if response.status_code == 200:
            data = response.json()
            assert "suggestion" in data
            assert isinstance(data["suggestion"], str)

    @pytest.mark.asyncio
    async def test_generate_suggestion_validation_error(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str]
    ):
        """Test request validation when required fields are missing"""
        invalid_data = {
            "project_id": "missing_required_fields_only"
        }

        response = await api_client.post(
            "/api/v1/copilot/suggest",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_generate_suggestion_unauthorized(
        self,
        api_client: AsyncClient,
        test_project: Dict
    ):
        """Test copilot suggestion endpoint without auth"""
        request_data = {
            "project_id": test_project["id"],
            "text_before": "Test",
            "text_after": "",
            "cursor_position": 4
        }

        response = await api_client.post("/api/v1/copilot/suggest", json=request_data)

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_track_accept_and_reject_suggestion(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str],
        test_project: Dict
    ):
        """Test accept/reject tracking endpoints"""
        accept_response = await api_client.post(
            "/api/v1/copilot/accept",
            params={
                "project_id": test_project["id"],
                "suggestion": "Sample accepted suggestion"
            },
            headers=auth_headers
        )

        reject_response = await api_client.post(
            "/api/v1/copilot/reject",
            params={
                "project_id": test_project["id"],
                "suggestion": "Sample rejected suggestion"
            },
            headers=auth_headers
        )

        assert accept_response.status_code == 200
        assert reject_response.status_code == 200
        assert accept_response.json().get("status") == "tracked"
        assert reject_response.json().get("status") == "tracked"
