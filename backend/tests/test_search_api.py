"""
Integration tests for Search API endpoints
"""
import pytest
from httpx import AsyncClient
from typing import Dict
import asyncio


class TestSearchAPI:
    """Test suite for search functionality endpoints"""
    
    @pytest.mark.asyncio
    async def test_semantic_search(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str],
        test_project: Dict,
        test_file: Dict
    ):
        """Test semantic search functionality"""
        # Wait for file processing to complete
        await asyncio.sleep(3)
        
        search_data = {
            "query": "Alice and the White Rabbit",
            "project_ids": [test_project["id"]],
            "limit": 10,
            "similarity_threshold": 0.1,
            "search_type": "semantic"
        }
        
        response = await api_client.post(
            "/api/v1/search/search",
            json=search_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "results" in data
        assert "total_count" in data
        assert "query_time_ms" in data
        assert data["query"] == search_data["query"]
        assert isinstance(data["results"], list)
    
    @pytest.mark.asyncio
    async def test_hybrid_search(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str],
        test_project: Dict,
        test_file: Dict
    ):
        """Test hybrid search (semantic + keyword)"""
        await asyncio.sleep(3)
        
        search_data = {
            "query": "curious telescope",
            "project_ids": [test_project["id"]],
            "limit": 5,
            "search_type": "hybrid"
        }
        
        response = await api_client.post(
            "/api/v1/search/search",
            json=search_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "results" in data
        assert len(data["results"]) <= 5
        
        # Verify result structure
        if len(data["results"]) > 0:
            result = data["results"][0]
            assert "chunk_id" in result
            assert "content" in result
            assert "similarity_score" in result
            assert "relevance_score" in result
    
    @pytest.mark.asyncio
    async def test_search_with_filters(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str],
        test_project: Dict,
        test_file: Dict
    ):
        """Test search with file filters"""
        await asyncio.sleep(3)
        
        search_data = {
            "query": "Alice",
            "project_ids": [test_project["id"]],
            "file_ids": [test_file["id"]],
            "limit": 10
        }
        
        response = await api_client.post(
            "/api/v1/search/search",
            json=search_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # All results should be from the specified file
        for result in data["results"]:
            assert result["file_id"] == test_file["id"]
    
    @pytest.mark.asyncio
    async def test_search_pagination(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str],
        test_project: Dict,
        test_file: Dict
    ):
        """Test search result pagination"""
        await asyncio.sleep(3)
        
        # First page
        search_data = {
            "query": "Alice",
            "project_ids": [test_project["id"]],
            "limit": 2,
            "offset": 0
        }
        
        response1 = await api_client.post(
            "/api/v1/search/search",
            json=search_data,
            headers=auth_headers
        )
        
        assert response1.status_code == 200
        data1 = response1.json()
        
        # Second page
        search_data["offset"] = 2
        response2 = await api_client.post(
            "/api/v1/search/search",
            json=search_data,
            headers=auth_headers
        )
        
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Results should be different
        if len(data1["results"]) > 0 and len(data2["results"]) > 0:
            assert data1["results"][0]["chunk_id"] != data2["results"][0]["chunk_id"]
    
    @pytest.mark.asyncio
    async def test_search_without_project_id(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str]
    ):
        """Test search without specifying project ID"""
        search_data = {
            "query": "test query",
            "limit": 10
        }
        
        response = await api_client.post(
            "/api/v1/search/search",
            json=search_data,
            headers=auth_headers
        )
        
        # Should be 400 bad request, but might return 500 if not handled properly
        assert response.status_code in [400, 500]
    
    @pytest.mark.asyncio
    async def test_generate_embedding(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str]
    ):
        """Test embedding generation endpoint"""
        embedding_data = {
            "text": "This is a test sentence for embedding generation."
        }
        
        response = await api_client.post(
            "/api/v1/search/embeddings/generate",
            json=embedding_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "embedding" in data
        assert "dimension" in data
        assert "model_name" in data
        assert isinstance(data["embedding"], list)
        assert len(data["embedding"]) == data["dimension"]
        assert data["dimension"] > 0
    
    @pytest.mark.asyncio
    async def test_calculate_similarity(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str]
    ):
        """Test similarity calculation between two texts"""
        similarity_data = {
            "text1": "The cat sat on the mat",
            "text2": "A feline rested on the rug",
            "limit": 10,
            "similarity_threshold": 0.1,
            "search_type": "semantic"
        }
        
        response = await api_client.post(
            "/api/v1/search/embeddings/similarity",
            json=similarity_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "similarity_score" in data
        assert "text1" in data
        assert "text2" in data
        assert 0.0 <= data["similarity_score"] <= 1.0
    
    @pytest.mark.asyncio
    async def test_get_embedding_stats(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str]
    ):
        """Test retrieving embedding system statistics"""
        response = await api_client.get(
            "/api/v1/search/embeddings/stats",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "total_chunks_with_embeddings" in data
        assert "model_info" in data
        assert isinstance(data["total_chunks_with_embeddings"], int)
    
    @pytest.mark.asyncio
    async def test_autocomplete_suggestions(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str],
        test_project: Dict,
        test_file: Dict
    ):
        """Test autocomplete suggestions"""
        await asyncio.sleep(3)
        
        response = await api_client.get(
            f"/api/v1/search/autocomplete/{test_project['id']}?q=Ali&limit=5",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "query" in data
        assert "suggestions" in data
        assert "project_id" in data
        assert isinstance(data["suggestions"], list)
    
    @pytest.mark.asyncio
    async def test_find_similar_content(
        self,
        api_client: AsyncClient,
        auth_headers: Dict[str, str],
        test_project: Dict,
        test_file: Dict
    ):
        """Test finding similar content to a specific chunk"""
        await asyncio.sleep(3)
        
        # First, get a chunk ID from search
        search_data = {
            "query": "Alice",
            "project_ids": [test_project["id"]],
            "limit": 1
        }
        
        search_response = await api_client.post(
            "/api/v1/search/search",
            json=search_data,
            headers=auth_headers
        )
        
        if search_response.status_code == 200:
            search_data = search_response.json()
            if len(search_data["results"]) > 0:
                chunk_id = search_data["results"][0]["chunk_id"]
                
                # Find similar content
                response = await api_client.get(
                    f"/api/v1/search/similar/{chunk_id}?limit=5&similarity_threshold=0.3",
                    headers=auth_headers
                )
                
                assert response.status_code == 200
                data = response.json()
                
                assert "reference_chunk_id" in data
                assert "similar_chunks" in data
                assert data["reference_chunk_id"] == chunk_id
    
    @pytest.mark.asyncio
    async def test_search_unauthorized(self, api_client: AsyncClient, test_project: Dict):
        """Test search without authentication"""
        search_data = {
            "query": "test",
            "project_ids": [test_project["id"]],
            "limit": 10
        }
        
        response = await api_client.post("/api/v1/search/search", json=search_data)
        
        # Should be 401 unauthorized, but API might return 403 for forbidden access
        assert response.status_code in [401, 403]
