"""
Unit tests for character repository feature flow
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch
from bson import ObjectId


class TestCharacterRepositoryFeature:
    """Unit tests for character repository persistence and indexing flow"""

    def test_entity_model_stores_character_attributes_and_role(self):
        """Test character profile attributes are persisted in entity model."""
        from app.models.entity import Entity, EntityType

        project_id = str(ObjectId())
        entity = Entity(
            project_id=project_id,
            type=EntityType.CHARACTER,
            name="Mara",
            attributes={
                "personality_traits": ["witty", "guarded"],
                "emotional_tendencies": ["anxious under pressure"],
                "narrative_role": "protagonist"
            }
        )

        assert entity.type == EntityType.CHARACTER
        assert entity.get_attribute("narrative_role") == "protagonist"
        assert "witty" in entity.get_attribute("personality_traits")

    @pytest.mark.asyncio
    async def test_entity_repository_get_by_project_and_character_type(self):
        """Test repository links characters to project and type filter."""
        from app.repositories.entity_repository import EntityRepository
        from app.models.entity import EntityType

        project_id = str(ObjectId())
        repo = EntityRepository()
        repo.get_many = AsyncMock(return_value=[])

        await repo.get_by_project_and_type(project_id, EntityType.CHARACTER, skip=5, limit=25)

        repo.get_many.assert_awaited_once()
        args, kwargs = repo.get_many.await_args
        assert args[0]["project_id"] == ObjectId(project_id)
        assert args[0]["type"] == EntityType.CHARACTER
        assert kwargs["skip"] == 5
        assert kwargs["limit"] == 25

    @pytest.mark.asyncio
    async def test_process_uploaded_file_updates_existing_character_metadata(self):
        """Test character metadata update and indexing pipeline for existing entity."""
        from app.api.v1.endpoints import files as files_endpoint

        file_id = str(ObjectId())
        project_id = str(ObjectId())

        mock_file_record = Mock()
        mock_file_record.id = file_id
        mock_file_record.project_id = project_id
        mock_file_record.text_content = "Mara spoke sharply."

        mock_chunk = Mock()
        mock_chunk.content = "Mara spoke sharply."
        mock_chunk.start_position = 0
        mock_chunk.end_position = 20
        mock_chunk.chunk_index = 0
        mock_chunk.word_count = 3

        extracted_entity = Mock()
        extracted_entity.name = "Mara"
        extracted_entity.type = "character"
        extracted_entity.mention_count = 2
        extracted_entity.confidence_score = 0.6
        extracted_entity.last_mentioned = Mock()
        extracted_entity.last_mentioned.dict = Mock(return_value={"file_id": file_id, "position": 12})

        existing_entity = Mock()
        existing_entity.id = str(ObjectId())
        existing_entity.mention_count = 3
        existing_entity.confidence_score = 0.8

        mock_entity_repo = Mock()
        mock_entity_repo.get_by_name = AsyncMock(return_value=existing_entity)
        mock_entity_repo.update_by_id = AsyncMock(return_value=existing_entity)

        mock_relationship_repo = Mock()
        mock_text_chunk_repo = Mock()

        mock_entity_service = Mock()
        mock_entity_service.extract_entities_from_text = AsyncMock(return_value=[extracted_entity])

        mock_embedding_service = Mock()
        mock_embedding_service.store_text_chunks_with_embeddings = AsyncMock(return_value=[{"id": "c1"}])

        mock_relationship_service = Mock()
        mock_relationship_service.discover_relationships_for_project = AsyncMock(return_value=[])

        files_endpoint.file_repository.update_processing_status = AsyncMock()
        files_endpoint.file_repository.get_by_id = AsyncMock(return_value=mock_file_record)
        files_endpoint.text_extraction_service.chunk_text = AsyncMock(return_value=[mock_chunk])

        with patch("app.repositories.entity_repository.EntityRepository", return_value=mock_entity_repo), \
             patch("app.repositories.relationship_repository.RelationshipRepository", return_value=mock_relationship_repo), \
             patch("app.repositories.text_chunk_repository.TextChunkRepository", return_value=mock_text_chunk_repo), \
             patch("app.services.entity_extraction_service.EntityExtractionService", return_value=mock_entity_service), \
             patch("app.services.embedding_service.EmbeddingService", return_value=mock_embedding_service), \
             patch("app.services.relationship_discovery_service.RelationshipDiscoveryService", return_value=mock_relationship_service):
            await files_endpoint.process_uploaded_file(file_id, project_id)

        mock_entity_repo.update_by_id.assert_awaited_once()
        _, update_kwargs = mock_entity_repo.update_by_id.await_args
        update_payload = update_kwargs if update_kwargs else mock_entity_repo.update_by_id.await_args.args[1]
        assert update_payload["mention_count"] == 5
        assert update_payload["confidence_score"] == 0.7
        mock_embedding_service.store_text_chunks_with_embeddings.assert_awaited_once()
        mock_relationship_service.discover_relationships_for_project.assert_awaited_once_with(project_id)

    @pytest.mark.asyncio
    async def test_process_uploaded_file_creates_new_character_when_missing(self):
        """Test new character is created when no existing profile is found."""
        from app.api.v1.endpoints import files as files_endpoint

        file_id = str(ObjectId())
        project_id = str(ObjectId())

        mock_file_record = Mock()
        mock_file_record.id = file_id
        mock_file_record.project_id = project_id
        mock_file_record.text_content = "Iris entered the room."

        mock_chunk = Mock()
        mock_chunk.content = "Iris entered the room."
        mock_chunk.start_position = 0
        mock_chunk.end_position = 22
        mock_chunk.chunk_index = 0
        mock_chunk.word_count = 4

        extracted_entity = Mock()
        extracted_entity.name = "Iris"
        extracted_entity.type = "character"
        extracted_entity.mention_count = 1
        extracted_entity.confidence_score = 0.9
        extracted_entity.last_mentioned = None

        mock_entity_repo = Mock()
        mock_entity_repo.get_by_name = AsyncMock(return_value=None)
        mock_entity_repo.create = AsyncMock(return_value=Mock(id=str(ObjectId())))

        mock_relationship_repo = Mock()
        mock_text_chunk_repo = Mock()

        mock_entity_service = Mock()
        mock_entity_service.extract_entities_from_text = AsyncMock(return_value=[extracted_entity])

        mock_embedding_service = Mock()
        mock_embedding_service.store_text_chunks_with_embeddings = AsyncMock(return_value=[{"id": "c1"}])

        mock_relationship_service = Mock()
        mock_relationship_service.discover_relationships_for_project = AsyncMock(return_value=[])

        files_endpoint.file_repository.update_processing_status = AsyncMock()
        files_endpoint.file_repository.get_by_id = AsyncMock(return_value=mock_file_record)
        files_endpoint.text_extraction_service.chunk_text = AsyncMock(return_value=[mock_chunk])

        with patch("app.repositories.entity_repository.EntityRepository", return_value=mock_entity_repo), \
             patch("app.repositories.relationship_repository.RelationshipRepository", return_value=mock_relationship_repo), \
             patch("app.repositories.text_chunk_repository.TextChunkRepository", return_value=mock_text_chunk_repo), \
             patch("app.services.entity_extraction_service.EntityExtractionService", return_value=mock_entity_service), \
             patch("app.services.embedding_service.EmbeddingService", return_value=mock_embedding_service), \
             patch("app.services.relationship_discovery_service.RelationshipDiscoveryService", return_value=mock_relationship_service):
            await files_endpoint.process_uploaded_file(file_id, project_id)

        mock_entity_repo.create.assert_awaited_once_with(extracted_entity)
        mock_embedding_service.store_text_chunks_with_embeddings.assert_awaited_once()
