from typing import Optional, Dict, Any, List
from datetime import datetime
from bson import ObjectId
import logging

from app.core.repository import BaseRepository
from app.models.project import Project, IndexingStatus

logger = logging.getLogger(__name__)


class ProjectRepository(BaseRepository[Project]):
    """Project repository with CRUD operations"""
    
    def __init__(self):
        super().__init__("projects")
    
    def _to_model(self, document: Dict[str, Any]) -> Project:
        """Convert MongoDB document to Project model"""
        return Project.from_dict(document)
    
    def _to_document(self, model: Project) -> Dict[str, Any]:
        """Convert Project model to MongoDB document"""
        return model.to_dict()
    
    async def get_by_owner(self, owner_id: str, skip: int = 0, limit: int = 100) -> List[Project]:
        """Get projects by owner ID"""
        return await self.get_many(
            {"owner_id": ObjectId(owner_id)}, 
            skip=skip, 
            limit=limit,
            sort=[("updated_at", -1)]
        )
    
    async def get_by_owner_and_name(self, owner_id: str, name: str) -> Optional[Project]:
        """Get project by owner ID and name"""
        return await self.get_by_filter({
            "owner_id": ObjectId(owner_id),
            "name": name
        })
    
    async def update_indexing_status(self, project_id: str, status: IndexingStatus) -> Optional[Project]:
        """Update project indexing status"""
        update_data = {"indexing_status": status}
        if status == IndexingStatus.COMPLETED:
            update_data["stats.last_indexed"] = datetime.utcnow()
        
        return await self.update_by_id(project_id, update_data)
    
    async def update_stats(self, project_id: str, stats_update: Dict[str, Any]) -> Optional[Project]:
        """Update project statistics"""
        # Prefix stats fields with 'stats.'
        update_data = {f"stats.{key}": value for key, value in stats_update.items()}
        return await self.update_by_id(project_id, update_data)
    
    async def increment_stats(self, project_id: str, stats_increment: Dict[str, int]) -> Optional[Project]:
        """Increment project statistics"""
        try:
            # Use MongoDB $inc operator for atomic increments
            increment_data = {f"stats.{key}": value for key, value in stats_increment.items()}
            
            result = await self.collection.find_one_and_update(
                {"_id": ObjectId(project_id)},
                {"$inc": increment_data, "$set": {"updated_at": datetime.utcnow()}},
                return_document=True
            )
            
            return self._to_model(result) if result else None
            
        except Exception as e:
            logger.error(f"Error incrementing stats for project {project_id}: {e}")
            raise
    
    async def get_projects_by_status(self, status: IndexingStatus, skip: int = 0, limit: int = 100) -> List[Project]:
        """Get projects by indexing status"""
        return await self.get_many(
            {"indexing_status": status}, 
            skip=skip, 
            limit=limit,
            sort=[("created_at", -1)]
        )
    
    async def search_projects(self, owner_id: str, query: str, skip: int = 0, limit: int = 100) -> List[Project]:
        """Search projects by name or description"""
        filter_dict = {
            "owner_id": ObjectId(owner_id),
            "$or": [
                {"name": {"$regex": query, "$options": "i"}},
                {"description": {"$regex": query, "$options": "i"}}
            ]
        }
        return await self.get_many(filter_dict, skip=skip, limit=limit)
    
    async def get_project_stats_summary(self, owner_id: str) -> Dict[str, Any]:
        """Get summary statistics for user's projects"""
        try:
            pipeline = [
                {"$match": {"owner_id": ObjectId(owner_id)}},
                {"$group": {
                    "_id": None,
                    "total_projects": {"$sum": 1},
                    "total_files": {"$sum": "$stats.file_count"},
                    "total_entities": {"$sum": "$stats.entity_count"},
                    "total_words": {"$sum": "$stats.total_words"},
                    "completed_projects": {
                        "$sum": {"$cond": [{"$eq": ["$indexing_status", "completed"]}, 1, 0]}
                    },
                    "processing_projects": {
                        "$sum": {"$cond": [{"$eq": ["$indexing_status", "processing"]}, 1, 0]}
                    }
                }}
            ]
            
            result = await self.aggregate(pipeline)
            return result[0] if result else {
                "total_projects": 0,
                "total_files": 0,
                "total_entities": 0,
                "total_words": 0,
                "completed_projects": 0,
                "processing_projects": 0
            }
            
        except Exception as e:
            logger.error(f"Error getting project stats summary for user {owner_id}: {e}")
            return {
                "total_projects": 0,
                "total_files": 0,
                "total_entities": 0,
                "total_words": 0,
                "completed_projects": 0,
                "processing_projects": 0
            }