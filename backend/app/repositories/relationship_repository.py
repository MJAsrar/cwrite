from typing import Optional, Dict, Any, List
from datetime import datetime
from bson import ObjectId
import logging

from app.core.repository import BaseRepository
from app.models.relationship import Relationship, RelationshipType

logger = logging.getLogger(__name__)


class RelationshipRepository(BaseRepository[Relationship]):
    """Relationship repository with CRUD operations"""
    
    def __init__(self):
        super().__init__("relationships")
    
    def _to_model(self, document: Dict[str, Any]) -> Relationship:
        """Convert MongoDB document to Relationship model"""
        return Relationship.from_dict(document)
    
    def _to_document(self, model: Relationship) -> Dict[str, Any]:
        """Convert Relationship model to MongoDB document"""
        return model.to_dict()
    
    async def get_by_project(self, project_id: str, skip: int = 0, limit: int = 100) -> List[Relationship]:
        """Get relationships by project ID"""
        return await self.get_many(
            {"project_id": ObjectId(project_id)}, 
            skip=skip, 
            limit=limit,
            sort=[("strength", -1)]
        )
    
    async def get_by_entity(self, entity_id: str, skip: int = 0, limit: int = 100) -> List[Relationship]:
        """Get relationships involving a specific entity"""
        return await self.get_many(
            {
                "$or": [
                    {"source_entity_id": ObjectId(entity_id)},
                    {"target_entity_id": ObjectId(entity_id)}
                ]
            },
            skip=skip,
            limit=limit,
            sort=[("strength", -1)]
        )
    
    async def get_relationship(self, source_entity_id: str, target_entity_id: str) -> Optional[Relationship]:
        """Get specific relationship between two entities"""
        # Check both directions since relationships can be bidirectional
        relationship = await self.get_by_filter({
            "source_entity_id": ObjectId(source_entity_id),
            "target_entity_id": ObjectId(target_entity_id)
        })
        
        if not relationship:
            relationship = await self.get_by_filter({
                "source_entity_id": ObjectId(target_entity_id),
                "target_entity_id": ObjectId(source_entity_id)
            })
        
        return relationship
    
    async def get_by_type(self, project_id: str, relationship_type: RelationshipType, skip: int = 0, limit: int = 100) -> List[Relationship]:
        """Get relationships by type"""
        return await self.get_many(
            {
                "project_id": ObjectId(project_id),
                "relationship_type": relationship_type
            },
            skip=skip,
            limit=limit,
            sort=[("strength", -1)]
        )
    
    async def get_strong_relationships(self, project_id: str, min_strength: float = 0.5, skip: int = 0, limit: int = 100) -> List[Relationship]:
        """Get relationships above minimum strength threshold"""
        return await self.get_many(
            {
                "project_id": ObjectId(project_id),
                "strength": {"$gte": min_strength}
            },
            skip=skip,
            limit=limit,
            sort=[("strength", -1)]
        )
    
    async def increment_co_occurrence(self, relationship_id: str, context_snippet: Optional[str] = None) -> Optional[Relationship]:
        """Increment co-occurrence count and add context"""
        try:
            update_data = {
                "$inc": {"co_occurrence_count": 1},
                "$set": {"updated_at": datetime.utcnow()}
            }
            
            if context_snippet:
                update_data["$addToSet"] = {"context_snippets": context_snippet}
            
            result = await self.collection.find_one_and_update(
                {"_id": ObjectId(relationship_id)},
                update_data,
                return_document=True
            )
            
            if result:
                # Update strength based on new co-occurrence count
                relationship = self._to_model(result)
                relationship.update_strength()
                await self.update_by_id(relationship_id, {"strength": relationship.strength})
                return relationship
            
            return None
            
        except Exception as e:
            logger.error(f"Error incrementing co-occurrence for relationship {relationship_id}: {e}")
            raise
    
    async def update_strength(self, relationship_id: str, strength: float) -> Optional[Relationship]:
        """Update relationship strength"""
        return await self.update_by_id(relationship_id, {"strength": strength})
    
    async def add_context_snippet(self, relationship_id: str, context_snippet: str) -> Optional[Relationship]:
        """Add context snippet to relationship"""
        try:
            result = await self.collection.find_one_and_update(
                {"_id": ObjectId(relationship_id)},
                {
                    "$addToSet": {"context_snippets": context_snippet},
                    "$set": {"updated_at": datetime.utcnow()}
                },
                return_document=True
            )
            
            return self._to_model(result) if result else None
            
        except Exception as e:
            logger.error(f"Error adding context snippet to relationship {relationship_id}: {e}")
            raise
    
    async def delete_by_entity(self, entity_id: str) -> int:
        """Delete all relationships involving an entity"""
        return await self.delete_by_filter({
            "$or": [
                {"source_entity_id": ObjectId(entity_id)},
                {"target_entity_id": ObjectId(entity_id)}
            ]
        })
    
    async def delete_by_project(self, project_id: str) -> int:
        """Delete all relationships for a project"""
        return await self.delete_by_filter({"project_id": ObjectId(project_id)})
    
    async def get_relationship_stats_by_project(self, project_id: str) -> Dict[str, Any]:
        """Get relationship statistics for a project"""
        try:
            pipeline = [
                {"$match": {"project_id": ObjectId(project_id)}},
                {"$group": {
                    "_id": "$relationship_type",
                    "count": {"$sum": 1},
                    "avg_strength": {"$avg": "$strength"},
                    "total_co_occurrences": {"$sum": "$co_occurrence_count"}
                }}
            ]
            
            results = await self.aggregate(pipeline)
            
            stats = {
                "total_relationships": 0,
                "total_co_occurrences": 0,
                "avg_strength": 0.0,
                "by_type": {}
            }
            
            total_relationships = 0
            total_strength = 0.0
            
            for result in results:
                rel_type = result["_id"]
                count = result["count"]
                avg_strength = result["avg_strength"]
                co_occurrences = result["total_co_occurrences"]
                
                stats["total_relationships"] += count
                stats["total_co_occurrences"] += co_occurrences
                total_relationships += count
                total_strength += avg_strength * count
                
                stats["by_type"][rel_type] = {
                    "count": count,
                    "avg_strength": avg_strength,
                    "co_occurrences": co_occurrences
                }
            
            if total_relationships > 0:
                stats["avg_strength"] = total_strength / total_relationships
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting relationship stats for project {project_id}: {e}")
            return {
                "total_relationships": 0,
                "total_co_occurrences": 0,
                "avg_strength": 0.0,
                "by_type": {}
            }
    
    async def get_entity_network(self, project_id: str, entity_id: str, max_depth: int = 2) -> List[Dict[str, Any]]:
        """Get entity network (relationships up to max_depth)"""
        try:
            pipeline = [
                {"$match": {"project_id": ObjectId(project_id)}},
                {
                    "$graphLookup": {
                        "from": f"{self.collection_name}",
                        "startWith": ObjectId(entity_id),
                        "connectFromField": "target_entity_id",
                        "connectToField": "source_entity_id",
                        "as": "network",
                        "maxDepth": max_depth - 1
                    }
                }
            ]
            
            results = await self.aggregate(pipeline)
            return results
            
        except Exception as e:
            logger.error(f"Error getting entity network for {entity_id}: {e}")
            return []