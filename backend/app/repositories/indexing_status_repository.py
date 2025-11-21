"""
Indexing Status Repository

This module provides data access operations for indexing status tracking.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from bson import ObjectId
import logging

from app.core.repository import BaseRepository
from app.models.indexing_status import (
    IndexingStatus, IndexingTaskType, IndexingTaskStatus, 
    ProjectIndexingStats
)

logger = logging.getLogger(__name__)


class IndexingStatusRepository(BaseRepository[IndexingStatus]):
    """Indexing status repository with CRUD operations"""
    
    def __init__(self):
        super().__init__("indexing_status")
    
    def _to_model(self, document: Dict[str, Any]) -> IndexingStatus:
        """Convert MongoDB document to IndexingStatus model"""
        return IndexingStatus.from_dict(document)
    
    def _to_document(self, model: IndexingStatus) -> Dict[str, Any]:
        """Convert IndexingStatus model to MongoDB document"""
        return model.to_dict()
    
    async def get_by_task_id(self, task_id: str) -> Optional[IndexingStatus]:
        """Get indexing status by task ID"""
        return await self.get_by_filter({"task_id": task_id})
    
    async def get_by_project(
        self, 
        project_id: str, 
        task_type: Optional[IndexingTaskType] = None,
        status: Optional[IndexingTaskStatus] = None,
        skip: int = 0, 
        limit: int = 100
    ) -> List[IndexingStatus]:
        """Get indexing statuses by project ID with optional filtering"""
        filter_dict = {"project_id": ObjectId(project_id)}
        
        if task_type:
            filter_dict["task_type"] = task_type
        
        if status:
            filter_dict["status"] = status
        
        return await self.get_many(
            filter_dict, 
            skip=skip, 
            limit=limit,
            sort=[("created_at", -1)]
        )
    
    async def get_active_tasks(self, project_id: Optional[str] = None) -> List[IndexingStatus]:
        """Get all active indexing tasks"""
        filter_dict = {
            "status": {
                "$in": [
                    IndexingTaskStatus.PENDING,
                    IndexingTaskStatus.STARTED,
                    IndexingTaskStatus.PROGRESS
                ]
            }
        }
        
        if project_id:
            filter_dict["project_id"] = ObjectId(project_id)
        
        return await self.get_many(filter_dict, sort=[("created_at", -1)])
    
    async def get_recent_tasks(
        self, 
        project_id: str, 
        hours: int = 24, 
        limit: int = 50
    ) -> List[IndexingStatus]:
        """Get recent indexing tasks within specified hours"""
        since = datetime.utcnow() - timedelta(hours=hours)
        
        return await self.get_many(
            {
                "project_id": ObjectId(project_id),
                "created_at": {"$gte": since}
            },
            limit=limit,
            sort=[("created_at", -1)]
        )
    
    async def update_task_progress(
        self, 
        task_id: str, 
        current: int, 
        total: int = None,
        status_message: str = None
    ) -> Optional[IndexingStatus]:
        """Update task progress"""
        try:
            # Calculate percentage
            percentage = (current / total * 100) if total and total > 0 else 0
            
            update_data = {
                "status": IndexingTaskStatus.PROGRESS,
                "progress.current": current,
                "progress.percentage": percentage,
                "updated_at": datetime.utcnow()
            }
            
            if total is not None:
                update_data["progress.total"] = total
            
            if status_message is not None:
                update_data["progress.status_message"] = status_message
            
            result = await self.collection.find_one_and_update(
                {"task_id": task_id},
                {"$set": update_data},
                return_document=True
            )
            
            return self._to_model(result) if result else None
            
        except Exception as e:
            logger.error(f"Error updating task progress for {task_id}: {e}")
            raise
    
    async def mark_task_started(self, task_id: str) -> Optional[IndexingStatus]:
        """Mark task as started"""
        return await self.update_by_filter(
            {"task_id": task_id},
            {
                "status": IndexingTaskStatus.STARTED,
                "started_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        )
    
    async def mark_task_completed(
        self, 
        task_id: str, 
        result: Dict[str, Any] = None
    ) -> Optional[IndexingStatus]:
        """Mark task as completed successfully"""
        update_data = {
            "status": IndexingTaskStatus.SUCCESS,
            "completed_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "progress.current": 100,
            "progress.percentage": 100.0
        }
        
        if result:
            update_data["result"] = result
        
        return await self.update_by_filter({"task_id": task_id}, update_data)
    
    async def mark_task_failed(
        self, 
        task_id: str, 
        error_message: str
    ) -> Optional[IndexingStatus]:
        """Mark task as failed"""
        return await self.update_by_filter(
            {"task_id": task_id},
            {
                "status": IndexingTaskStatus.FAILURE,
                "error_message": error_message,
                "completed_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        )
    
    async def cleanup_old_tasks(self, days: int = 30) -> int:
        """Clean up old completed tasks"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        return await self.delete_by_filter({
            "status": {"$in": [IndexingTaskStatus.SUCCESS, IndexingTaskStatus.FAILURE]},
            "completed_at": {"$lt": cutoff_date}
        })
    
    async def get_project_stats(self, project_id: str) -> ProjectIndexingStats:
        """Get indexing statistics for a project"""
        try:
            pipeline = [
                {"$match": {"project_id": ObjectId(project_id)}},
                {"$group": {
                    "_id": None,
                    "total_tasks": {"$sum": 1},
                    "active_tasks": {
                        "$sum": {
                            "$cond": [
                                {
                                    "$in": [
                                        "$status", 
                                        [
                                            IndexingTaskStatus.PENDING,
                                            IndexingTaskStatus.STARTED,
                                            IndexingTaskStatus.PROGRESS
                                        ]
                                    ]
                                }, 
                                1, 
                                0
                            ]
                        }
                    },
                    "completed_tasks": {
                        "$sum": {
                            "$cond": [{"$eq": ["$status", IndexingTaskStatus.SUCCESS]}, 1, 0]
                        }
                    },
                    "failed_tasks": {
                        "$sum": {
                            "$cond": [{"$eq": ["$status", IndexingTaskStatus.FAILURE]}, 1, 0]
                        }
                    },
                    "last_indexing": {"$max": "$created_at"},
                    "durations": {
                        "$push": {
                            "$cond": [
                                {
                                    "$and": [
                                        {"$ne": ["$started_at", None]},
                                        {"$ne": ["$completed_at", None]}
                                    ]
                                },
                                {
                                    "$divide": [
                                        {"$subtract": ["$completed_at", "$started_at"]},
                                        1000  # Convert to seconds
                                    ]
                                },
                                None
                            ]
                        }
                    }
                }},
                {"$addFields": {
                    "avg_duration_seconds": {
                        "$avg": {
                            "$filter": {
                                "input": "$durations",
                                "cond": {"$ne": ["$$this", None]}
                            }
                        }
                    }
                }}
            ]
            
            results = await self.aggregate(pipeline)
            
            if results:
                result = results[0]
                return ProjectIndexingStats(
                    project_id=project_id,
                    total_tasks=result.get('total_tasks', 0),
                    active_tasks=result.get('active_tasks', 0),
                    completed_tasks=result.get('completed_tasks', 0),
                    failed_tasks=result.get('failed_tasks', 0),
                    last_indexing=result.get('last_indexing'),
                    avg_duration_seconds=result.get('avg_duration_seconds')
                )
            else:
                return ProjectIndexingStats(project_id=project_id)
                
        except Exception as e:
            logger.error(f"Error getting project stats for {project_id}: {e}")
            return ProjectIndexingStats(project_id=project_id)
    
    async def cancel_active_tasks(self, project_id: str, task_type: Optional[IndexingTaskType] = None) -> int:
        """Cancel active tasks for a project"""
        filter_dict = {
            "project_id": ObjectId(project_id),
            "status": {
                "$in": [
                    IndexingTaskStatus.PENDING,
                    IndexingTaskStatus.STARTED,
                    IndexingTaskStatus.PROGRESS
                ]
            }
        }
        
        if task_type:
            filter_dict["task_type"] = task_type
        
        # Update active tasks to revoked status
        result = await self.collection.update_many(
            filter_dict,
            {
                "$set": {
                    "status": IndexingTaskStatus.REVOKED,
                    "completed_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                    "error_message": "Task cancelled by user"
                }
            }
        )
        
        return result.modified_count
    
    async def get_task_history(
        self, 
        project_id: str, 
        task_type: Optional[IndexingTaskType] = None,
        limit: int = 100
    ) -> List[IndexingStatus]:
        """Get task history for a project"""
        filter_dict = {"project_id": ObjectId(project_id)}
        
        if task_type:
            filter_dict["task_type"] = task_type
        
        return await self.get_many(
            filter_dict,
            limit=limit,
            sort=[("created_at", -1)]
        )
    
    async def delete_by_project(self, project_id: str) -> int:
        """Delete all indexing status records for a project"""
        return await self.delete_by_filter({"project_id": ObjectId(project_id)})