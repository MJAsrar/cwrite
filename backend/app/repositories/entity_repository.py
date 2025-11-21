from typing import Optional, Dict, Any, List
from datetime import datetime
from bson import ObjectId
import logging

from app.core.repository import BaseRepository
from app.models.entity import Entity, EntityType

logger = logging.getLogger(__name__)


class EntityRepository(BaseRepository[Entity]):
    """Entity repository with CRUD operations"""
    
    def __init__(self):
        super().__init__("entities")
    
    def _to_model(self, document: Dict[str, Any]) -> Entity:
        """Convert MongoDB document to Entity model"""
        return Entity.from_dict(document)
    
    def _to_document(self, model: Entity) -> Dict[str, Any]:
        """Convert Entity model to MongoDB document"""
        return model.to_dict()
    
    async def get_by_project(self, project_id: str, skip: int = 0, limit: int = 100) -> List[Entity]:
        """Get entities by project ID"""
        return await self.get_many(
            {"project_id": ObjectId(project_id)}, 
            skip=skip, 
            limit=limit,
            sort=[("mention_count", -1)]
        )
    
    async def get_by_project_and_type(self, project_id: str, entity_type: EntityType, skip: int = 0, limit: int = 100) -> List[Entity]:
        """Get entities by project ID and type"""
        return await self.get_many(
            {
                "project_id": ObjectId(project_id),
                "type": entity_type
            }, 
            skip=skip, 
            limit=limit,
            sort=[("mention_count", -1)]
        )
    
    async def get_by_name(self, project_id: str, name: str, entity_type: Optional[EntityType] = None) -> Optional[Entity]:
        """Get entity by project ID and name"""
        filter_dict = {
            "project_id": ObjectId(project_id),
            "name": name
        }
        if entity_type:
            filter_dict["type"] = entity_type
        
        return await self.get_by_filter(filter_dict)
    
    async def search_entities(self, project_id: str, query: str, entity_type: Optional[EntityType] = None, skip: int = 0, limit: int = 100) -> List[Entity]:
        """Search entities by name or aliases"""
        filter_dict = {
            "project_id": ObjectId(project_id),
            "$or": [
                {"name": {"$regex": query, "$options": "i"}},
                {"aliases": {"$regex": query, "$options": "i"}}
            ]
        }
        
        if entity_type:
            filter_dict["type"] = entity_type
        
        return await self.get_many(filter_dict, skip=skip, limit=limit)
    
    async def get_by_file(self, file_id: str, skip: int = 0, limit: int = 10000) -> List[Entity]:
        """Get entities mentioned in a specific file"""
        return await self.get_many(
            {
                "$or": [
                    {"first_mentioned.file_id": ObjectId(file_id)},
                    {"last_mentioned.file_id": ObjectId(file_id)}
                ]
            },
            skip=skip,
            limit=limit
        )
    
    async def get_entities_by_confidence(self, project_id: str, min_confidence: float, skip: int = 0, limit: int = 100) -> List[Entity]:
        """Get entities by minimum confidence score"""
        return await self.get_many(
            {
                "project_id": ObjectId(project_id),
                "confidence_score": {"$gte": min_confidence}
            },
            skip=skip,
            limit=limit,
            sort=[("confidence_score", -1)]
        )
    
    async def get_top_entities(self, project_id: str, entity_type: Optional[EntityType] = None, limit: int = 10) -> List[Entity]:
        """Get top entities by mention count"""
        filter_dict = {"project_id": ObjectId(project_id)}
        if entity_type:
            filter_dict["type"] = entity_type
        
        return await self.get_many(
            filter_dict,
            limit=limit,
            sort=[("mention_count", -1)]
        )
    
    async def increment_mention_count(self, entity_id: str, increment: int = 1) -> Optional[Entity]:
        """Increment entity mention count"""
        try:
            result = await self.collection.find_one_and_update(
                {"_id": ObjectId(entity_id)},
                {
                    "$inc": {"mention_count": increment},
                    "$set": {"updated_at": datetime.utcnow()}
                },
                return_document=True
            )
            
            return self._to_model(result) if result else None
            
        except Exception as e:
            logger.error(f"Error incrementing mention count for entity {entity_id}: {e}")
            raise
    
    async def update_confidence(self, entity_id: str, new_confidence: float) -> Optional[Entity]:
        """Update entity confidence score"""
        return await self.update_by_id(entity_id, {"confidence_score": new_confidence})
    
    async def add_alias(self, entity_id: str, alias: str) -> Optional[Entity]:
        """Add alias to entity"""
        try:
            result = await self.collection.find_one_and_update(
                {"_id": ObjectId(entity_id)},
                {
                    "$addToSet": {"aliases": alias},
                    "$set": {"updated_at": datetime.utcnow()}
                },
                return_document=True
            )
            
            return self._to_model(result) if result else None
            
        except Exception as e:
            logger.error(f"Error adding alias to entity {entity_id}: {e}")
            raise
    
    async def delete_by_project(self, project_id: str) -> int:
        """Delete all entities for a project"""
        return await self.delete_by_filter({"project_id": ObjectId(project_id)})
    
    async def search_by_name(self, project_id: str, partial_name: str, limit: int = 10) -> List[Entity]:
        """Search entities by partial name match for autocomplete"""
        try:
            return await self.get_many(
                {
                    "project_id": ObjectId(project_id),
                    "$or": [
                        {"name": {"$regex": f"^{partial_name}", "$options": "i"}},
                        {"aliases": {"$regex": f"^{partial_name}", "$options": "i"}}
                    ]
                },
                limit=limit,
                sort=[("mention_count", -1)]
            )
        except Exception as e:
            logger.error(f"Error searching entities by name: {e}")
            return []
    
    async def get_many_by_ids(self, entity_ids: List[str]) -> List[Entity]:
        """Get multiple entities by their IDs"""
        try:
            object_ids = [ObjectId(eid) for eid in entity_ids if ObjectId.is_valid(eid)]
            return await self.get_many({"_id": {"$in": object_ids}})
        except Exception as e:
            logger.error(f"Error getting entities by IDs: {e}")
            return []

    async def get_entity_stats_by_project(self, project_id: str) -> Dict[str, Any]:
        """Get entity statistics for a project"""
        try:
            pipeline = [
                {"$match": {"project_id": ObjectId(project_id)}},
                {"$group": {
                    "_id": "$type",
                    "count": {"$sum": 1},
                    "total_mentions": {"$sum": "$mention_count"},
                    "avg_confidence": {"$avg": "$confidence_score"}
                }}
            ]
            
            results = await self.aggregate(pipeline)
            
            stats = {
                "total_entities": 0,
                "total_mentions": 0,
                "character_count": 0,
                "location_count": 0,
                "theme_count": 0,
                "avg_confidence": 0.0
            }
            
            total_entities = 0
            total_confidence = 0.0
            
            for result in results:
                entity_type = result["_id"]
                count = result["count"]
                mentions = result["total_mentions"]
                confidence = result["avg_confidence"]
                
                stats["total_entities"] += count
                stats["total_mentions"] += mentions
                total_entities += count
                total_confidence += confidence * count
                
                if entity_type == EntityType.CHARACTER:
                    stats["character_count"] = count
                elif entity_type == EntityType.LOCATION:
                    stats["location_count"] = count
                elif entity_type == EntityType.THEME:
                    stats["theme_count"] = count
            
            if total_entities > 0:
                stats["avg_confidence"] = total_confidence / total_entities
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting entity stats for project {project_id}: {e}")
            return {
                "total_entities": 0,
                "total_mentions": 0,
                "character_count": 0,
                "location_count": 0,
                "theme_count": 0,
                "avg_confidence": 0.0
            }