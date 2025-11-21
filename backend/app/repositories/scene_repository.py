from typing import Optional, Dict, Any, List
from datetime import datetime
from bson import ObjectId
import logging

from app.core.repository import BaseRepository
from app.models.scene import Scene, SceneBreakType

logger = logging.getLogger(__name__)


class SceneRepository(BaseRepository[Scene]):
    """Scene repository with CRUD operations"""
    
    def __init__(self):
        super().__init__("scenes")
    
    def _to_model(self, document: Dict[str, Any]) -> Scene:
        """Convert MongoDB document to Scene model"""
        return Scene.from_dict(document)
    
    def _to_document(self, model: Scene) -> Dict[str, Any]:
        """Convert Scene model to MongoDB document"""
        return model.to_dict()
    
    async def get_by_file(self, file_id: str, skip: int = 0, limit: int = 1000) -> List[Scene]:
        """Get all scenes for a file"""
        return await self.get_many(
            {"file_id": ObjectId(file_id)},
            skip=skip,
            limit=limit,
            sort=[("scene_number", 1)]
        )
    
    async def get_by_project(self, project_id: str, skip: int = 0, limit: int = 1000) -> List[Scene]:
        """Get all scenes for a project"""
        return await self.get_many(
            {"project_id": ObjectId(project_id)},
            skip=skip,
            limit=limit,
            sort=[("created_at", -1)]
        )
    
    async def get_by_chapter(self, file_id: str, chapter_number: int) -> List[Scene]:
        """Get all scenes in a specific chapter"""
        return await self.get_many(
            {
                "file_id": ObjectId(file_id),
                "chapter_number": chapter_number
            },
            sort=[("scene_number", 1)]
        )
    
    async def get_by_character(self, project_id: str, entity_id: str, skip: int = 0, limit: int = 100) -> List[Scene]:
        """Get all scenes where a character is present"""
        return await self.get_many(
            {
                "project_id": ObjectId(project_id),
                "characters_present": ObjectId(entity_id)
            },
            skip=skip,
            limit=limit,
            sort=[("scene_number", 1)]
        )
    
    async def get_scene_by_number(self, file_id: str, scene_number: int) -> Optional[Scene]:
        """Get a specific scene by its number"""
        return await self.get_by_filter({
            "file_id": ObjectId(file_id),
            "scene_number": scene_number
        })
    
    async def get_by_break_type(self, file_id: str, break_type: SceneBreakType) -> List[Scene]:
        """Get scenes by break type"""
        return await self.get_many(
            {
                "file_id": ObjectId(file_id),
                "break_type": break_type
            },
            sort=[("scene_number", 1)]
        )
    
    async def get_scene_at_position(self, file_id: str, char_pos: int) -> Optional[Scene]:
        """Get the scene at a specific character position"""
        return await self.get_by_filter({
            "file_id": ObjectId(file_id),
            "start_char_pos": {"$lte": char_pos},
            "end_char_pos": {"$gt": char_pos}
        })
    
    async def get_dialogue_heavy_scenes(self, file_id: str, min_percentage: float = 0.5) -> List[Scene]:
        """Get scenes with high dialogue percentage"""
        return await self.get_many(
            {
                "file_id": ObjectId(file_id),
                "dialogue_percentage": {"$gte": min_percentage}
            },
            sort=[("dialogue_percentage", -1)]
        )
    
    async def delete_by_file(self, file_id: str) -> int:
        """Delete all scenes for a file"""
        result = await self.collection.delete_many({"file_id": ObjectId(file_id)})
        return result.deleted_count
    
    async def count_by_file(self, file_id: str) -> int:
        """Count scenes in a file"""
        return await self.collection.count_documents({"file_id": ObjectId(file_id)})
    
    async def get_chapters(self, file_id: str) -> List[int]:
        """Get list of unique chapter numbers in a file"""
        pipeline = [
            {"$match": {"file_id": ObjectId(file_id), "chapter_number": {"$ne": None}}},
            {"$group": {"_id": "$chapter_number"}},
            {"$sort": {"_id": 1}}
        ]
        
        result = await self.collection.aggregate(pipeline).to_list(None)
        return [doc["_id"] for doc in result]


