"""
End-to-end integration tests for complete user workflows
"""
import pytest
from httpx import AsyncClient
from typing import Dict
import asyncio


class TestCompleteWorkflows:
    """Test complete user workflows from start to finish"""
    
    @pytest.mark.asyncio
    async def test_complete_project_workflow(self, api_client: AsyncClient):
        """
        Test complete workflow: Register -> Create Project -> Upload File -> Search -> Delete
        """
        import time
        unique_id = int(time.time())
        
        # Step 1: Register user
        register_data = {
            "email": f"workflow_test_{unique_id}@example.com",
            "password": "WorkflowTest123!",
            "confirm_password": "WorkflowTest123!"
        }
        
        register_response = await api_client.post(
            "/api/v1/auth/register",
            json=register_data
        )
        assert register_response.status_code == 201
        
        auth_data = register_response.json()
        headers = {"Authorization": f"Bearer {auth_data['tokens']['access_token']}"}
        
        # Step 2: Create project
        project_data = {
            "name": f"Workflow Test Project {unique_id}",
            "description": "Testing complete workflow"
        }
        
        project_response = await api_client.post(
            "/api/v1/projects/",
            json=project_data,
            headers=headers
        )
        assert project_response.status_code == 200
        project = project_response.json()
        
        # Step 3: Upload file
        file_content = b"This is test content for workflow testing. Alice meets Bob."
        files = {"file": ("workflow_test.txt", file_content, "text/plain")}
        
        upload_response = await api_client.post(
            f"/api/v1/projects/{project['id']}/files/upload",
            files=files,
            headers=headers
        )
        assert upload_response.status_code == 200
        file_data = upload_response.json()
        
        # Step 4: Wait for processing
        await asyncio.sleep(5)
        
        # Step 5: Search for content
        search_data = {
            "query": "Alice Bob",
            "project_ids": [project["id"]],
            "limit": 10
        }
        
        search_response = await api_client.post(
            "/api/v1/search/search",
            json=search_data,
            headers=headers
        )
        assert search_response.status_code == 200
        search_results = search_response.json()
        assert "results" in search_results
        
        # Step 6: Get file stats
        stats_response = await api_client.get(
            f"/api/v1/projects/{project['id']}/files/stats",
            headers=headers
        )
        assert stats_response.status_code == 200
        
        # Step 7: Delete file
        delete_file_response = await api_client.delete(
            f"/api/v1/files/{file_data['id']}",
            headers=headers
        )
        assert delete_file_response.status_code == 200
        
        # Step 8: Delete project
        delete_project_response = await api_client.delete(
            f"/api/v1/projects/{project['id']}",
            headers=headers
        )
        assert delete_project_response.status_code == 200
        
        # Step 9: Logout
        logout_response = await api_client.post(
            "/api/v1/auth/logout",
            headers=headers
        )
        assert logout_response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_file_update_workflow(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str],
        test_project: Dict
    ):
        """
        Test file update workflow: Upload -> Update Content -> Verify Changes
        """
        # Upload initial file
        initial_content = b"Initial content for update testing."
        files = {"file": ("update_workflow.txt", initial_content, "text/plain")}
        
        upload_response = await api_client.post(
            f"/api/v1/projects/{test_project['id']}/files/upload",
            files=files,
            headers=auth_headers
        )
        assert upload_response.status_code == 200
        file_data = upload_response.json()
        
        # Wait for initial processing
        await asyncio.sleep(3)
        
        # Update file content
        updated_content = "Updated content with new information for testing."
        update_data = {"text_content": updated_content}
        
        update_response = await api_client.put(
            f"/api/v1/files/{file_data['id']}",
            json=update_data,
            headers=auth_headers
        )
        assert update_response.status_code == 200
        
        # Verify content was updated
        content_response = await api_client.get(
            f"/api/v1/files/{file_data['id']}/content?format=text",
            headers=auth_headers
        )
        assert content_response.status_code == 200
        assert updated_content in content_response.text
        
        # Cleanup
        await api_client.delete(
            f"/api/v1/files/{file_data['id']}",
            headers=auth_headers
        )
    
    @pytest.mark.asyncio
    async def test_multi_file_search_workflow(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str],
        test_project: Dict
    ):
        """
        Test searching across multiple files
        """
        # Upload multiple files
        file1_content = b"Alice went to the market to buy apples."
        file2_content = b"Bob stayed home and read a book about adventures."
        
        files1 = {"file": ("file1.txt", file1_content, "text/plain")}
        files2 = {"file": ("file2.txt", file2_content, "text/plain")}
        
        upload1 = await api_client.post(
            f"/api/v1/projects/{test_project['id']}/files/upload",
            files=files1,
            headers=auth_headers
        )
        upload2 = await api_client.post(
            f"/api/v1/projects/{test_project['id']}/files/upload",
            files=files2,
            headers=auth_headers
        )
        
        assert upload1.status_code == 200
        assert upload2.status_code == 200
        
        file1_data = upload1.json()
        file2_data = upload2.json()
        
        # Wait for processing
        await asyncio.sleep(5)
        
        # Search across both files
        search_data = {
            "query": "adventures",
            "project_ids": [test_project["id"]],
            "limit": 10
        }
        
        search_response = await api_client.post(
            "/api/v1/search/search",
            json=search_data,
            headers=auth_headers
        )
        assert search_response.status_code == 200
        
        # Cleanup
        await api_client.delete(f"/api/v1/files/{file1_data['id']}", headers=auth_headers)
        await api_client.delete(f"/api/v1/files/{file2_data['id']}", headers=auth_headers)
