from typing import Optional, Dict, Any, List
from datetime import datetime
from bson import ObjectId
import logging

from app.core.repository import BaseRepository
from app.models.position_index import PositionIndex

logger = logging.getLogger(__name__)


class PositionIndexRepository(BaseRepository[PositionIndex]):
    """Position index repository with CRUD operations"""
    
    def __init__(self):
        super().__init__("position_indexes")
    
    def _to_model(self, document: Dict[str, Any]) -> PositionIndex:
        """Convert MongoDB document to PositionIndex model"""
        return PositionIndex.from_dict(document)
    
    def _to_document(self, model: PositionIndex) -> Dict[str, Any]:
        """Convert PositionIndex model to MongoDB document"""
        return model.to_dict()
    
    async def get_by_file(self, file_id: str, skip: int = 0, limit: int = 10000) -> List[PositionIndex]:
        """Get all position indexes for a file"""
        return await self.get_many(
            {"file_id": ObjectId(file_id)},
            skip=skip,
            limit=limit,
            sort=[("line_number", 1)]
        )
    
    async def get_line(self, file_id: str, line_number: int) -> Optional[PositionIndex]:
        """Get a specific line by line number"""
        return await self.get_by_filter({
            "file_id": ObjectId(file_id),
            "line_number": line_number
        })
    
    async def get_lines_range(self, file_id: str, start_line: int, end_line: int) -> List[PositionIndex]:
        """Get a range of lines"""
        return await self.get_many(
            {
                "file_id": ObjectId(file_id),
                "line_number": {"$gte": start_line, "$lte": end_line}
            },
            sort=[("line_number", 1)]
        )
    
    async def get_by_scene(self, scene_id: str) -> List[PositionIndex]:
        """Get all lines in a scene"""
        return await self.get_many(
            {"scene_id": ObjectId(scene_id)},
            sort=[("line_number", 1)]
        )
    
    async def get_by_chapter(self, file_id: str, chapter_number: int) -> List[PositionIndex]:
        """Get all lines in a chapter"""
        return await self.get_many(
            {
                "file_id": ObjectId(file_id),
                "chapter_number": chapter_number
            },
            sort=[("line_number", 1)]
        )
    
    async def get_by_paragraph(self, file_id: str, paragraph_number: int) -> List[PositionIndex]:
        """Get all lines in a paragraph"""
        return await self.get_many(
            {
                "file_id": ObjectId(file_id),
                "paragraph_number": paragraph_number
            },
            sort=[("line_number", 1)]
        )
    
    async def get_at_position(self, file_id: str, char_pos: int) -> Optional[PositionIndex]:
        """Get the line at a specific character position"""
        return await self.get_by_filter({
            "file_id": ObjectId(file_id),
            "start_char_pos": {"$lte": char_pos},
            "end_char_pos": {"$gte": char_pos}
        })
    
    async def search_content(self, file_id: str, search_term: str, case_sensitive: bool = False) -> List[PositionIndex]:
        """Search for lines containing a term"""
        if case_sensitive:
            regex_filter = {"$regex": search_term}
        else:
            regex_filter = {"$regex": search_term, "$options": "i"}
        
        return await self.get_many(
            {
                "file_id": ObjectId(file_id),
                "line_content": regex_filter
            },
            sort=[("line_number", 1)]
        )
    
    async def get_dialogue_lines(self, file_id: str) -> List[PositionIndex]:
        """Get all lines containing dialogue"""
        return await self.get_many(
            {
                "file_id": ObjectId(file_id),
                "is_dialogue": True
            },
            sort=[("line_number", 1)]
        )
    
    async def get_non_empty_lines(self, file_id: str) -> List[PositionIndex]:
        """Get all non-empty lines"""
        return await self.get_many(
            {
                "file_id": ObjectId(file_id),
                "is_empty": False
            },
            sort=[("line_number", 1)]
        )
    
    async def count_by_file(self, file_id: str) -> int:
        """Count lines in a file"""
        return await self.collection.count_documents({"file_id": ObjectId(file_id)})
    
    async def count_non_empty(self, file_id: str) -> int:
        """Count non-empty lines"""
        return await self.collection.count_documents({
            "file_id": ObjectId(file_id),
            "is_empty": False
        })
    
    async def count_dialogue_lines(self, file_id: str) -> int:
        """Count dialogue lines"""
        return await self.collection.count_documents({
            "file_id": ObjectId(file_id),
            "is_dialogue": True
        })
    
    async def delete_by_file(self, file_id: str) -> int:
        """Delete all position indexes for a file"""
        result = await self.collection.delete_many({"file_id": ObjectId(file_id)})
        return result.deleted_count
    
    async def get_total_words(self, file_id: str) -> int:
        """Get total word count for a file"""
        pipeline = [
            {"$match": {"file_id": ObjectId(file_id)}},
            {"$group": {"_id": None, "total": {"$sum": "$word_count"}}}
        ]
        
        result = await self.collection.aggregate(pipeline).to_list(None)
        return result[0]["total"] if result else 0
    
    async def get_line_count_by_scene(self, scene_id: str) -> int:
        """Count lines in a scene"""
        return await self.collection.count_documents({"scene_id": ObjectId(scene_id)})


