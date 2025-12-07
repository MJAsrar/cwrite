"""
Unit tests for EmbeddingService
"""
import pytest
from unittest.mock import Mock, AsyncMock
import numpy as np


class TestEmbeddingService:
    """Unit tests for embedding service"""
    
    @pytest.mark.asyncio
    async def test_generate_embedding(self):
        """Test embedding generation"""
        from app.services.embedding_service import EmbeddingService
        from unittest.mock import patch
        
        # Create service with mocked dependencies
        mock_text_chunk_repo = Mock()
        mock_chroma_service = Mock()
        
        # Create service
        service = EmbeddingService(mock_text_chunk_repo, chroma_service=mock_chroma_service)
        
        # Mock the model directly on the service instance
        mock_model = Mock()
        text = "This is a test sentence"
        expected_embedding = np.array([0.1, 0.2, 0.3, 0.4])
        mock_model.encode = Mock(return_value=expected_embedding)
        service._model = mock_model
        
        # Generate embedding
        result = await service.generate_embedding(text)
        
        # Verify results
        assert result is not None
        assert isinstance(result, list)
        assert len(result) > 0
        assert result is not None
        assert isinstance(result, list)
        assert len(result) > 0
        # Verify the model was called
        assert mock_model.encode.called
    
    def test_calculate_similarity(self):
        """Test similarity calculation"""
        from app.services.embedding_service import EmbeddingService
        
        service = EmbeddingService(Mock(), chroma_service=Mock())
        
        emb1 = [1.0, 0.0, 0.0]
        emb2 = [1.0, 0.0, 0.0]
        
        similarity = service.calculate_similarity(emb1, emb2)
        
        assert similarity == pytest.approx(1.0, abs=0.01)
    
    @pytest.mark.asyncio
    async def test_get_embedding_stats(self):
        """Test getting embedding statistics"""
        from app.services.embedding_service import EmbeddingService
        
        service = EmbeddingService(Mock(), chroma_service=Mock())
        service.text_chunk_repository.count = AsyncMock(return_value=100)
        
        stats = await service.get_embedding_stats()
        
        assert "total_chunks_with_embeddings" in stats
        assert "model_info" in stats
