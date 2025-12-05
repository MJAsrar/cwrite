"""
Integration tests for system health and basic endpoints
"""
import pytest
from httpx import AsyncClient


class TestSystemHealth:
    """Test suite for system health checks"""
    
    @pytest.mark.asyncio
    async def test_root_endpoint(self, api_client: AsyncClient):
        """Test root endpoint returns API information"""
        response = await api_client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert "version" in data
        assert "status" in data
        assert data["status"] == "running"
    
    @pytest.mark.asyncio
    async def test_health_check(self, api_client: AsyncClient):
        """Test health check endpoint"""
        response = await api_client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "status" in data
        assert data["status"] == "healthy"
        assert "environment" in data
    
    @pytest.mark.asyncio
    async def test_api_docs_available(self, api_client: AsyncClient):
        """Test that API documentation is accessible (in debug mode)"""
        response = await api_client.get("/docs")
        
        # Docs might be disabled in production
        assert response.status_code in [200, 404]
