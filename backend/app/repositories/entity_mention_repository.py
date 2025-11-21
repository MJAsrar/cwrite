from typing import Optional, Dict, Any, List
from datetime import datetime
from bson import ObjectId
import logging

from app.core.repository import BaseRepository
from app.models.entity_mention import DetailedEntityMention

logger = logging.getLogger(__name__)


class EntityMentionRepository(BaseRepository[DetailedEntityMention]):
    """Entity mention repository with CRUD operations"""
    
    def __init__(self):
        super().__init__("entity_mentions")
    
    def _to_model(self, document: Dict[str, Any]) -> DetailedEntityMention:
        """Convert MongoDB document to DetailedEntityMention model"""
        return DetailedEntityMention.from_dict(document)
    
    def _to_document(self, model: DetailedEntityMention) -> Dict[str, Any]:
        """Convert DetailedEntityMention model to MongoDB document"""
        return model.to_dict()
    
    async def get_by_entity(self, entity_id: str, skip: int = 0, limit: int = 1000) -> List[DetailedEntityMention]:
        """Get all mentions of a specific entity"""
        return await self.get_many(
            {"entity_id": ObjectId(entity_id)},
            skip=skip,
            limit=limit,
            sort=[("mention_index", 1)]
        )
    
    async def get_by_file(self, file_id: str, skip: int = 0, limit: int = 1000) -> List[DetailedEntityMention]:
        """Get all entity mentions in a file"""
        return await self.get_many(
            {"file_id": ObjectId(file_id)},
            skip=skip,
            limit=limit,
            sort=[("start_char_pos", 1)]
        )
    
    async def get_by_entity_and_file(self, entity_id: str, file_id: str) -> List[DetailedEntityMention]:
        """Get all mentions of an entity in a specific file"""
        return await self.get_many(
            {
                "entity_id": ObjectId(entity_id),
                "file_id": ObjectId(file_id)
            },
            sort=[("mention_index", 1)]
        )
    
    async def get_by_scene(self, scene_id: str) -> List[DetailedEntityMention]:
        """Get all entity mentions in a scene"""
        return await self.get_many(
            {"scene_id": ObjectId(scene_id)},
            sort=[("start_char_pos", 1)]
        )
    
    async def get_by_line(self, file_id: str, line_number: int) -> List[DetailedEntityMention]:
        """Get all entity mentions on a specific line"""
        return await self.get_many(
            {
                "file_id": ObjectId(file_id),
                "line_number": line_number
            },
            sort=[("start_char_pos", 1)]
        )
    
    async def get_at_position(self, file_id: str, char_pos: int) -> Optional[DetailedEntityMention]:
        """Get entity mention at a specific character position"""
        return await self.get_by_filter({
            "file_id": ObjectId(file_id),
            "start_char_pos": {"$lte": char_pos},
            "end_char_pos": {"$gte": char_pos}
        })
    
    async def get_nearby_mentions(
        self, 
        entity_id: str, 
        file_id: str, 
        char_pos: int, 
        distance: int = 500
    ) -> List[DetailedEntityMention]:
        """Get mentions near a specific position"""
        return await self.get_many(
            {
                "entity_id": ObjectId(entity_id),
                "file_id": ObjectId(file_id),
                "start_char_pos": {
                    "$gte": char_pos - distance,
                    "$lte": char_pos + distance
                }
            },
            sort=[("start_char_pos", 1)]
        )
    
    async def get_direct_mentions_only(self, entity_id: str, file_id: str) -> List[DetailedEntityMention]:
        """Get only direct mentions (exclude pronoun references)"""
        return await self.get_many(
            {
                "entity_id": ObjectId(entity_id),
                "file_id": ObjectId(file_id),
                "is_direct_mention": True
            },
            sort=[("mention_index", 1)]
        )
    
    async def count_by_entity(self, entity_id: str) -> int:
        """Count total mentions of an entity"""
        return await self.collection.count_documents({"entity_id": ObjectId(entity_id)})
    
    async def count_by_file(self, file_id: str) -> int:
        """Count total entity mentions in a file"""
        return await self.collection.count_documents({"file_id": ObjectId(file_id)})
    
    async def delete_by_file(self, file_id: str) -> int:
        """Delete all mentions in a file"""
        result = await self.collection.delete_many({"file_id": ObjectId(file_id)})
        return result.deleted_count
    
    async def delete_by_entity(self, entity_id: str) -> int:
        """Delete all mentions of an entity"""
        result = await self.collection.delete_many({"entity_id": ObjectId(entity_id)})
        return result.deleted_count
    
    async def get_first_mention(self, entity_id: str, file_id: str) -> Optional[DetailedEntityMention]:
        """Get the first mention of an entity in a file"""
        mentions = await self.get_many(
            {
                "entity_id": ObjectId(entity_id),
                "file_id": ObjectId(file_id)
            },
            limit=1,
            sort=[("mention_index", 1)]
        )
        return mentions[0] if mentions else None
    
    async def get_last_mention(self, entity_id: str, file_id: str) -> Optional[DetailedEntityMention]:
        """Get the last mention of an entity in a file"""
        mentions = await self.get_many(
            {
                "entity_id": ObjectId(entity_id),
                "file_id": ObjectId(file_id)
            },
            limit=1,
            sort=[("mention_index", -1)]
        )
        return mentions[0] if mentions else None


