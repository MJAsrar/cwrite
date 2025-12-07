"""
Unit tests for RAGContextService
"""
import pytest
from unittest.mock import Mock, AsyncMock


class TestRAGContextService:
    """Unit tests for RAG context service"""
    
    @pytest.mark.asyncio
    async def test_assemble_context(self):
        """Test context assembly"""
        from app.services.rag_context_service import RAGContextService
        
        # Mock dependencies
        mock_embedding_service = Mock()
        mock_embedding_service.semantic_search = AsyncMock(return_value=[
            {
                'content': 'Test content',
                'file_id': 'file123',
                'chunk_index': 0,
                'score': 0.9,
                'entities_mentioned': []
            }
        ])
        
        service = RAGContextService(embedding_service=mock_embedding_service)
        
        context = await service.assemble_context(
            query="Test query",
            project_id="proj123",
            max_chunks=5
        )
        
        assert 'query' in context
        assert 'chunks' in context
        assert 'entities' in context
        assert 'metadata' in context
        assert len(context['chunks']) > 0
    
    @pytest.mark.asyncio
    async def test_get_project_overview(self):
        """Test project overview generation"""
        from app.services.rag_context_service import RAGContextService
        from app.models.entity import Entity, EntityType, EntityMention
        from datetime import datetime
        
        mock_entity_repo = Mock()
        from bson import ObjectId
        file_id = str(ObjectId())
        
        mock_entity_repo.get_by_project = AsyncMock(return_value=[
            Entity(
                project_id="proj123",
                name="Alice",
                type=EntityType.CHARACTER,
                mention_count=10,
                confidence_score=0.9,
                aliases=[],
                first_mentioned=EntityMention(file_id=file_id, position=0, context="", confidence=0.9),
                last_mentioned=EntityMention(file_id=file_id, position=100, context="", confidence=0.9),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
        ])
        
        mock_relationship_repo = Mock()
        mock_relationship_repo.get_by_project = AsyncMock(return_value=[])
        
        mock_chunk_repo = Mock()
        mock_chunk_repo.get_by_project = AsyncMock(return_value=[])
        
        service = RAGContextService(
            entity_repo=mock_entity_repo,
            relationship_repo=mock_relationship_repo,
            text_chunk_repo=mock_chunk_repo
        )
        
        overview = await service.get_project_overview("proj123")
        
        assert 'total_entities' in overview
        assert 'characters' in overview
        assert 'locations' in overview
        assert 'themes' in overview
    
    def test_format_context_for_llm(self):
        """Test LLM context formatting"""
        from app.services.rag_context_service import RAGContextService
        
        service = RAGContextService()
        
        context = {
            'chunks': [
                {
                    'content': 'Test content',
                    'similarity': 0.9
                }
            ],
            'entities': [
                {
                    'name': 'Alice',
                    'type': 'CHARACTER',
                    'aliases': ['Al'],
                    'mentions': 10
                }
            ],
            'scenes': [],
            'relationships': []
        }
        
        formatted = service.format_context_for_llm(context)
        
        assert isinstance(formatted, str)
        assert 'Alice' in formatted
        assert 'Test content' in formatted
    
    @pytest.mark.asyncio
    async def test_get_entity_context(self):
        """Test entity context retrieval"""
        from app.services.rag_context_service import RAGContextService
        from app.models.entity import Entity, EntityType, EntityMention
        from datetime import datetime
        
        mock_entity_repo = Mock()
        from bson import ObjectId
        file_id = str(ObjectId())
        
        mock_entity = Entity(
            id="e1",
            project_id="proj123",
            name="Alice",
            type=EntityType.CHARACTER,
            mention_count=10,
            confidence_score=0.9,
            aliases=[],
            first_mentioned=EntityMention(file_id=file_id, position=0, context="", confidence=0.9),
            last_mentioned=EntityMention(file_id=file_id, position=100, context="", confidence=0.9),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        mock_entity_repo.get_by_id = AsyncMock(return_value=mock_entity)
        
        mock_relationship_repo = Mock()
        mock_relationship_repo.get_entity_relationships = AsyncMock(return_value=[])
        
        mock_mention_repo = Mock()
        mock_mention_repo.get_by_entity = AsyncMock(return_value=[])
        
        service = RAGContextService(
            entity_repo=mock_entity_repo,
            relationship_repo=mock_relationship_repo,
            entity_mention_repo=mock_mention_repo
        )
        
        entity_context = await service.get_entity_context("e1", "proj123")
        
        assert 'entity' in entity_context
        assert entity_context['entity']['name'] == 'Alice'
    
    @pytest.mark.asyncio
    async def test_assemble_context_with_file_filter(self):
        """Test context assembly with file filtering"""
        from app.services.rag_context_service import RAGContextService
        from bson import ObjectId
        
        mock_embedding_service = Mock()
        mock_embedding_service.semantic_search = AsyncMock(return_value=[])
        
        mock_scene_repo = Mock()
        mock_scene_repo.get_by_file = AsyncMock(return_value=[])
        
        service = RAGContextService(
            embedding_service=mock_embedding_service,
            scene_repo=mock_scene_repo
        )
        
        # Use valid ObjectId format
        valid_file_id = str(ObjectId())
        
        context = await service.assemble_context(
            query="Test",
            project_id="proj123",
            file_id=valid_file_id,
            include_scenes=True
        )
        
        assert 'chunks' in context
        assert 'scenes' in context
