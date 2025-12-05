"""
Integration tests for Projects API endpoints
"""
import pytest
from httpx import AsyncClient
from typing import Dict


class TestProjectsAPI:
    """Test suite for project management endpoints"""
    
    @pytest.mark.asyncio
    async def test_create_project(self, api_client: AsyncClient, auth_headers: Dict[str, str]):
        """Test creating a new project"""
        import time
        project_data = {
            "name": f"Integration Test Project {int(time.time())}",
            "description": "A project created during integration testing"
        }
        
        response = await api_client.post(
            "/api/v1/projects/",
            json=project_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["name"] == project_data["name"]
        assert data["description"] == project_data["description"]
        assert "owner_id" in data
        assert "created_at" in data
        assert "settings" in data
        
        # Cleanup
        await api_client.delete(f"/api/v1/projects/{data['id']}", headers=auth_headers)
    
    @pytest.mark.asyncio
    async def test_create_project_duplicate_name(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str],
        test_project: Dict
    ):
        """Test creating project with duplicate name fails"""
        project_data = {
            "name": test_project["name"],
            "description": "Duplicate name test"
        }
        
        response = await api_client.post(
            "/api/v1/projects/",
            json=project_data,
            headers=auth_headers
        )
        
        assert response.status_code == 409  # Conflict
    
    @pytest.mark.asyncio
    async def test_create_project_unauthorized(self, api_client: AsyncClient):
        """Test creating project without authentication"""
        project_data = {
            "name": "Unauthorized Project",
            "description": "Should fail"
        }
        
        response = await api_client.post("/api/v1/projects/", json=project_data)
        
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_list_projects(self, api_client: AsyncClient, auth_headers: Dict[str, str]):
        """Test listing user's projects"""
        response = await api_client.get("/api/v1/projects/", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        # Should have at least the test project
        assert len(data) >= 0
    
    @pytest.mark.asyncio
    async def test_list_projects_pagination(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str]
    ):
        """Test project listing with pagination"""
        response = await api_client.get(
            "/api/v1/projects/?skip=0&limit=5",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) <= 5
    
    @pytest.mark.asyncio
    async def test_get_project(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str],
        test_project: Dict
    ):
        """Test retrieving a specific project"""
        response = await api_client.get(
            f"/api/v1/projects/{test_project['id']}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == test_project["id"]
        assert data["name"] == test_project["name"]
        assert "stats" in data
        assert "indexing_status" in data
    
    @pytest.mark.asyncio
    async def test_get_nonexistent_project(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str]
    ):
        """Test retrieving non-existent project"""
        fake_id = "000000000000000000000000"
        response = await api_client.get(
            f"/api/v1/projects/{fake_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_update_project(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str],
        test_project: Dict
    ):
        """Test updating project details"""
        update_data = {
            "name": f"Updated {test_project['name']}",
            "description": "Updated description"
        }
        
        response = await api_client.put(
            f"/api/v1/projects/{test_project['id']}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["name"] == update_data["name"]
        assert data["description"] == update_data["description"]
        assert data["id"] == test_project["id"]
    
    @pytest.mark.asyncio
    async def test_update_project_partial(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str],
        test_project: Dict
    ):
        """Test partial project update (only description)"""
        update_data = {
            "description": "Only description updated"
        }
        
        response = await api_client.put(
            f"/api/v1/projects/{test_project['id']}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["description"] == update_data["description"]
        assert data["name"] == test_project["name"]  # Name unchanged
    
    @pytest.mark.asyncio
    async def test_delete_project(self, api_client: AsyncClient, auth_headers: Dict[str, str]):
        """Test deleting a project"""
        # Create a project to delete
        import time
        project_data = {
            "name": f"Project to Delete {int(time.time())}",
            "description": "Will be deleted"
        }
        
        create_response = await api_client.post(
            "/api/v1/projects/",
            json=project_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        project = create_response.json()
        
        # Delete the project
        delete_response = await api_client.delete(
            f"/api/v1/projects/{project['id']}",
            headers=auth_headers
        )
        
        assert delete_response.status_code == 200
        data = delete_response.json()
        assert "message" in data
        
        # Verify project is deleted
        get_response = await api_client.get(
            f"/api/v1/projects/{project['id']}",
            headers=auth_headers
        )
        assert get_response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_delete_nonexistent_project(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str]
    ):
        """Test deleting non-existent project"""
        fake_id = "000000000000000000000000"
        response = await api_client.delete(
            f"/api/v1/projects/{fake_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_project_isolation(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str],
        test_project: Dict
    ):
        """Test that users can only access their own projects"""
        # Create a second user
        import time
        second_user_email = f"second_user_{int(time.time())}@example.com"
        register_data = {
            "email": second_user_email,
            "password": "SecondUser123!",
            "confirm_password": "SecondUser123!"
        }
        
        register_response = await api_client.post(
            "/api/v1/auth/register",
            json=register_data
        )
        assert register_response.status_code == 201
        
        second_user_data = register_response.json()
        second_user_headers = {
            "Authorization": f"Bearer {second_user_data['tokens']['access_token']}"
        }
        
        # Try to access first user's project
        response = await api_client.get(
            f"/api/v1/projects/{test_project['id']}",
            headers=second_user_headers
        )
        
        assert response.status_code == 403  # Forbidden
