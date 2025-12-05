"""
Unit tests for SearchService
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch


class TestSearchService:
    """Unit tests for search service"""
    
    @pytest.mark.asyncio
    async def test_get_autocomplete_suggestions(self):
        """Test autocomplete suggestions"""
        from app.services.search_service import SearchService
        
        # Create service with all required dependencies
        service = SearchService(
            text_chunk_repository=Mock(),
            entity_repository=Mock(),
            file_repository=Mock(),
            search_log_repository=Mock(),
            embedding_service=Mock()
        )
        
        project_id = "proj123"
        query = "ali"
        
        # Mock entity search
        mock_entity1 = Mock()
        mock_entity1.name = "Alice"
        mock_entity2 = Mock()
        mock_entity2.name = "Alison"
        
        service.entity_repository.search_by_name = AsyncMock(return_value=[
            mock_entity1,
            mock_entity2
        ])
        
        suggestions = await service.get_autocomplete_suggestions(
            project_id, query, limit=5
        )
        
        assert len(suggestions) == 2
        assert "Alice" in suggestions
