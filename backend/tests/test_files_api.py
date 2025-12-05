"""
Integration tests for Files API endpoints
"""
import pytest
from httpx import AsyncClient
from typing import Dict
import asyncio


class TestFilesAPI:
    """Test suite for file management endpoints"""
    
    @pytest.mark.asyncio
    async def test_upload_file(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str],
        test_project: Dict
    ):
        """Test uploading a file to a project"""
        file_content = b"This is a test file content for upload testing."
        files = {
            "file": ("test_upload.txt", file_content, "text/plain")
        }
        
        response = await api_client.post(
            f"/api/v1/projects/{test_project['id']}/files/upload",
            files=files,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["filename"] == "test_upload.txt"
        assert data["project_id"] == test_project["id"]
        assert data["upload_status"] == "completed"
        assert "processing_status" in data
        
        # Cleanup
        await api_client.delete(f"/api/v1/files/{data['id']}", headers=auth_headers)
    
    @pytest.mark.asyncio
    async def test_upload_file_unauthorized(
        self,
        api_client: AsyncClient,
        test_project: Dict
    ):
        """Test uploading file without authentication"""
        file_content = b"Unauthorized upload attempt"
        files = {
            "file": ("unauthorized.txt", file_content, "text/plain")
        }
        
        response = await api_client.post(
            f"/api/v1/projects/{test_project['id']}/files/upload",
            files=files
        )
        
        # Should be 401 unauthorized, but API might return 403 for forbidden access
        assert response.status_code in [401, 403]
    
    @pytest.mark.asyncio
    async def test_upload_file_to_nonexistent_project(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str]
    ):
        """Test uploading file to non-existent project"""
        fake_project_id = "000000000000000000000000"
        file_content = b"Test content"
        files = {
            "file": ("test.txt", file_content, "text/plain")
        }
        
        response = await api_client.post(
            f"/api/v1/projects/{fake_project_id}/files/upload",
            files=files,
            headers=auth_headers
        )
        
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_list_project_files(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str],
        test_project: Dict,
        test_file: Dict
    ):
        """Test listing files in a project"""
        response = await api_client.get(
            f"/api/v1/projects/{test_project['id']}/files",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 1
        
        # Verify test file is in the list
        file_ids = [f["id"] for f in data]
        assert test_file["id"] in file_ids
    
    @pytest.mark.asyncio
    async def test_list_files_pagination(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str],
        test_project: Dict
    ):
        """Test file listing with pagination"""
        response = await api_client.get(
            f"/api/v1/projects/{test_project['id']}/files?skip=0&limit=10",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) <= 10
    
    @pytest.mark.asyncio
    async def test_get_file_metadata(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str],
        test_file: Dict
    ):
        """Test retrieving file metadata"""
        response = await api_client.get(
            f"/api/v1/files/{test_file['id']}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == test_file["id"]
        assert "filename" in data
        assert "size" in data
        assert "upload_status" in data
        assert "processing_status" in data
    
    @pytest.mark.asyncio
    async def test_get_file_content_text(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str],
        test_file: Dict
    ):
        """Test retrieving file content as text"""
        response = await api_client.get(
            f"/api/v1/files/{test_file['id']}/content?format=text",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/plain")
        
        content = response.text
        assert len(content) > 0
        assert "Alice" in content  # From test file fixture
    
    @pytest.mark.asyncio
    async def test_get_file_content_raw(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str],
        test_file: Dict
    ):
        """Test retrieving raw file content"""
        response = await api_client.get(
            f"/api/v1/files/{test_file['id']}/content?format=raw",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        content = response.content
        assert len(content) > 0
    
    @pytest.mark.asyncio
    async def test_get_file_processing_status(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str],
        test_file: Dict
    ):
        """Test retrieving file processing status"""
        response = await api_client.get(
            f"/api/v1/files/{test_file['id']}/processing-status",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "file_id" in data
        assert "upload_status" in data
        assert "processing_status" in data
        assert data["processing_status"] in ["pending", "processing", "completed", "failed"]
    
    @pytest.mark.asyncio
    async def test_update_file_content(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str],
        test_project: Dict
    ):
        """Test updating file content"""
        # First upload a file
        file_content = b"Original content"
        files = {"file": ("update_test.txt", file_content, "text/plain")}
        
        upload_response = await api_client.post(
            f"/api/v1/projects/{test_project['id']}/files/upload",
            files=files,
            headers=auth_headers
        )
        assert upload_response.status_code == 200
        file_data = upload_response.json()
        
        # Wait for initial processing
        await asyncio.sleep(2)
        
        # Update the content
        update_data = {
            "text_content": "Updated content with new information"
        }
        
        response = await api_client.put(
            f"/api/v1/files/{file_data['id']}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["text_content"] == update_data["text_content"]
        
        # Cleanup
        await api_client.delete(f"/api/v1/files/{file_data['id']}", headers=auth_headers)
    
    @pytest.mark.asyncio
    async def test_delete_file(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str],
        test_project: Dict
    ):
        """Test deleting a file"""
        # Upload a file to delete
        file_content = b"File to be deleted"
        files = {"file": ("delete_test.txt", file_content, "text/plain")}
        
        upload_response = await api_client.post(
            f"/api/v1/projects/{test_project['id']}/files/upload",
            files=files,
            headers=auth_headers
        )
        assert upload_response.status_code == 200
        file_data = upload_response.json()
        
        # Delete the file
        response = await api_client.delete(
            f"/api/v1/files/{file_data['id']}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert "deleted" in data["message"].lower()
        assert "deleted_chunks" in data
        
        # Verify file is deleted
        get_response = await api_client.get(
            f"/api/v1/files/{file_data['id']}",
            headers=auth_headers
        )
        assert get_response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_reprocess_file(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str],
        test_file: Dict
    ):
        """Test reprocessing a file"""
        response = await api_client.post(
            f"/api/v1/files/{test_file['id']}/reprocess",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert "file_id" in data
        assert data["status"] == "pending"
    
    @pytest.mark.asyncio
    async def test_get_project_file_stats(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str],
        test_project: Dict,
        test_file: Dict
    ):
        """Test retrieving file statistics for a project"""
        response = await api_client.get(
            f"/api/v1/projects/{test_project['id']}/files/stats",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "project_id" in data
        assert "file_statistics" in data
        assert "processing_statistics" in data
        assert data["project_id"] == test_project["id"]
    
    @pytest.mark.asyncio
    async def test_file_access_control(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str],
        test_file: Dict
    ):
        """Test that users cannot access files from other users' projects"""
        # Create a second user
        import time
        second_user_email = f"file_access_test_{int(time.time())}@example.com"
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
        
        # Try to access first user's file
        response = await api_client.get(
            f"/api/v1/files/{test_file['id']}",
            headers=second_user_headers
        )
        
        # Should be forbidden (403) but API might return 401 for unauthorized access
        assert response.status_code in [401, 403]
