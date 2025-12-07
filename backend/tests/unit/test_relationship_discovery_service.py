"""
Unit tests for RelationshipDiscoveryService
"""
import pytest
from unittest.mock import Mock, AsyncMock


class TestRelationshipDiscoveryService:
    """Unit tests for relationship discovery service"""
    
    def test_find_entity_in_text(self):
        """Test entity finding in text"""
        from app.services.relationship_discovery_service import RelationshipDiscoveryService
        
        service = RelationshipDiscoveryService(Mock(), Mock(), Mock())
        
        text = "Alice walked through the forest with Bob."
        
        assert service._find_entity_in_text("alice", text.lower())
        assert service._find_entity_in_text("bob", text.lower())
        assert not service._find_entity_in_text("charlie", text.lower())
    
    def test_extract_co_occurrence_context(self):
        """Test context extraction for co-occurrences"""
        from app.services.relationship_discovery_service import RelationshipDiscoveryService
        
        service = RelationshipDiscoveryService(Mock(), Mock(), Mock())
        
        text = "Alice and Bob walked through the forest together. They were friends."
        
        context = service._extract_co_occurrence_context(text, "alice", "bob")
        
        assert isinstance(context, str)
        assert "alice" in context.lower()
        assert "bob" in context.lower()
    
    def test_classify_relationship_type_character_location(self):
        """Test relationship type classification for character-location"""
        from app.services.relationship_discovery_service import RelationshipDiscoveryService
        from app.models.entity import EntityType
        from app.models.relationship import RelationshipType
        
        service = RelationshipDiscoveryService(Mock(), Mock(), Mock())
        
        contexts = ["Alice entered the forest.", "She was in London."]
        
        rel_type = service._classify_relationship_type(
            EntityType.CHARACTER,
            EntityType.LOCATION,
            contexts
        )
        
        assert rel_type == RelationshipType.LOCATED_IN
    
    def test_classify_relationship_type_character_character(self):
        """Test relationship type classification for character-character"""
        from app.services.relationship_discovery_service import RelationshipDiscoveryService
        from app.models.entity import EntityType
        from app.models.relationship import RelationshipType
        
        service = RelationshipDiscoveryService(Mock(), Mock(), Mock())
        
        contexts = ["Alice spoke to Bob.", "They talked together."]
        
        rel_type = service._classify_relationship_type(
            EntityType.CHARACTER,
            EntityType.CHARACTER,
            contexts
        )
        
        assert rel_type == RelationshipType.INTERACTS_WITH
    
    def test_calculate_co_occurrence_strength(self):
        """Test co-occurrence strength calculation"""
        from app.services.relationship_discovery_service import RelationshipDiscoveryService
        
        service = RelationshipDiscoveryService(Mock(), Mock(), Mock())
        
        # Test different co-occurrence counts
        assert service._calculate_co_occurrence_strength(0) == 0.0
        assert service._calculate_co_occurrence_strength(1) == 0.1
        assert service._calculate_co_occurrence_strength(3) > 0.1
        assert service._calculate_co_occurrence_strength(10) > 0.5
    
    def test_calculate_context_quality(self):
        """Test context quality calculation"""
        from app.services.relationship_discovery_service import RelationshipDiscoveryService
        
        service = RelationshipDiscoveryService(Mock(), Mock(), Mock())
        
        # High quality context with dialogue and meaningful words
        good_contexts = [
            '"Hello," Alice said to Bob. They talked and met together.',
            'She spoke with him about the important matter. They discussed it thoroughly.'
        ]
        quality = service._calculate_context_quality(good_contexts)
        assert quality >= 0.5  # Should be at least 0.5
        
        # Low quality context
        poor_contexts = ["Text"]
        quality = service._calculate_context_quality(poor_contexts)
        assert quality < 1.0
    
    def test_get_relationship_type_factor(self):
        """Test relationship type strength factors"""
        from app.services.relationship_discovery_service import RelationshipDiscoveryService
        from app.models.relationship import RelationshipType
        
        service = RelationshipDiscoveryService(Mock(), Mock(), Mock())
        
        # Different relationship types should have different factors
        factor1 = service._get_relationship_type_factor(RelationshipType.INTERACTS_WITH)
        factor2 = service._get_relationship_type_factor(RelationshipType.MENTIONS)
        
        assert factor1 > factor2  # Interactions are stronger than mentions
    
    @pytest.mark.asyncio
    async def test_analyze_co_occurrences(self):
        """Test co-occurrence analysis"""
        from app.services.relationship_discovery_service import RelationshipDiscoveryService
        from app.models.entity import Entity, EntityType, EntityMention
        from app.models.text_chunk import TextChunk
        from datetime import datetime
        
        service = RelationshipDiscoveryService(Mock(), Mock(), Mock())
        
        # Create mock entities with all required fields
        from bson import ObjectId
        file_id = str(ObjectId())
        
        entity1 = Entity(
            id="e1",
            project_id="proj123",
            name="Alice",
            type=EntityType.CHARACTER,
            aliases=[],
            confidence_score=0.9,
            mention_count=5,
            first_mentioned=EntityMention(file_id=file_id, position=0, context="", confidence=0.9),
            last_mentioned=EntityMention(file_id=file_id, position=100, context="", confidence=0.9),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        entity2 = Entity(
            id="e2",
            project_id="proj123",
            name="Bob",
            type=EntityType.CHARACTER,
            aliases=[],
            confidence_score=0.9,
            mention_count=5,
            first_mentioned=EntityMention(file_id=file_id, position=0, context="", confidence=0.9),
            last_mentioned=EntityMention(file_id=file_id, position=100, context="", confidence=0.9),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Create mock text chunk
        chunk = TextChunk(
            id="chunk1",
            file_id="file123",
            project_id="proj123",
            content="Alice and Bob walked together.",
            chunk_index=0,
            word_count=5
        )
        
        co_occurrences = await service._analyze_co_occurrences(
            [entity1, entity2],
            [chunk]
        )
        
        assert isinstance(co_occurrences, dict)
    
    @pytest.mark.asyncio
    async def test_discover_relationships_for_project(self):
        """Test project-wide relationship discovery"""
        from app.services.relationship_discovery_service import RelationshipDiscoveryService
        
        mock_entity_repo = Mock()
        mock_relationship_repo = Mock()
        mock_chunk_repo = Mock()
        
        mock_entity_repo.get_by_project = AsyncMock(return_value=[])
        mock_chunk_repo.get_by_project = AsyncMock(return_value=[])
        
        service = RelationshipDiscoveryService(
            mock_entity_repo,
            mock_relationship_repo,
            mock_chunk_repo
        )
        
        relationships = await service.discover_relationships_for_project("proj123")
        
        assert isinstance(relationships, list)
