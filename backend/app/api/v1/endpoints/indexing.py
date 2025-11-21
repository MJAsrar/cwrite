"""
Indexing API endpoints

This module provides REST API endpoints for indexing management and status tracking.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime
from celery.result import AsyncResult
from bson import ObjectId

from ....core.dependencies import get_current_user
from ....models.user import User
from ....models.indexing_status import (
    IndexingStatus, IndexingStatusResponse, IndexingStatusCreate,
    IndexingTaskType, IndexingTaskStatus, ProjectIndexingStats
)
from ....repositories.indexing_status_repository import IndexingStatusRepository
from ....repositories.project_repository import ProjectRepository
from ....tasks.indexing import (
    index_document_task, reindex_project_task, discover_relationships_task,
    batch_generate_embeddings_task, cleanup_orphaned_data_task
)
from ....core.celery import celery_app

logger = logging.getLogger(__name__)

router = APIRouter()

# Dependency injection
def get_indexing_status_repository() -> IndexingStatusRepository:
    return IndexingStatusRepository()

def get_project_repository() -> ProjectRepository:
    return ProjectRepository()


@router.post("/projects/{project_id}/indexing/reindex")
async def start_project_reindexing(
    project_id: str,
    incremental: bool = Query(False, description="Perform incremental reindexing"),
    current_user: User = Depends(get_current_user),
    project_repo: ProjectRepository = Depends(get_project_repository),
    status_repo: IndexingStatusRepository = Depends(get_indexing_status_repository)
):
    """
    Start project reindexing task
    """
    try:
        # Verify project ownership
        project = await project_repo.get_by_id(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this project")
        
        # Cancel any active reindexing tasks
        await status_repo.cancel_active_tasks(project_id, IndexingTaskType.PROJECT_REINDEXING)
        
        # Start reindexing task
        task = reindex_project_task.delay(project_id, incremental)
        
        # Create status record
        status_record = IndexingStatus(
            project_id=project_id,
            task_id=task.id,
            task_type=IndexingTaskType.PROJECT_REINDEXING,
            status=IndexingTaskStatus.PENDING,
            metadata={
                "incremental": incremental,
                "started_by": current_user.id
            }
        )
        
        created_status = await status_repo.create(status_record)
        
        return {
            "message": "Project reindexing started",
            "task_id": task.id,
            "project_id": project_id,
            "incremental": incremental,
            "status_id": created_status.id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting project reindexing: {e}")
        raise HTTPException(status_code=500, detail="Failed to start project reindexing")


@router.post("/projects/{project_id}/indexing/relationships")
async def start_relationship_discovery(
    project_id: str,
    force_rediscovery: bool = Query(False, description="Force rediscovery of existing relationships"),
    current_user: User = Depends(get_current_user),
    project_repo: ProjectRepository = Depends(get_project_repository),
    status_repo: IndexingStatusRepository = Depends(get_indexing_status_repository)
):
    """
    Start relationship discovery task
    """
    try:
        # Verify project ownership
        project = await project_repo.get_by_id(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this project")
        
        # Cancel any active relationship discovery tasks
        await status_repo.cancel_active_tasks(project_id, IndexingTaskType.RELATIONSHIP_DISCOVERY)
        
        # Start relationship discovery task
        task = discover_relationships_task.delay(project_id, force_rediscovery)
        
        # Create status record
        status_record = IndexingStatus(
            project_id=project_id,
            task_id=task.id,
            task_type=IndexingTaskType.RELATIONSHIP_DISCOVERY,
            status=IndexingTaskStatus.PENDING,
            metadata={
                "force_rediscovery": force_rediscovery,
                "started_by": current_user.id
            }
        )
        
        created_status = await status_repo.create(status_record)
        
        return {
            "message": "Relationship discovery started",
            "task_id": task.id,
            "project_id": project_id,
            "force_rediscovery": force_rediscovery,
            "status_id": created_status.id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting relationship discovery: {e}")
        raise HTTPException(status_code=500, detail="Failed to start relationship discovery")


@router.post("/projects/{project_id}/indexing/embeddings")
async def start_batch_embedding_generation(
    project_id: str,
    batch_size: int = Query(50, ge=1, le=200, description="Batch size for embedding generation"),
    current_user: User = Depends(get_current_user),
    project_repo: ProjectRepository = Depends(get_project_repository),
    status_repo: IndexingStatusRepository = Depends(get_indexing_status_repository)
):
    """
    Start batch embedding generation task
    """
    try:
        # Verify project ownership
        project = await project_repo.get_by_id(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this project")
        
        # Cancel any active embedding generation tasks
        await status_repo.cancel_active_tasks(project_id, IndexingTaskType.BATCH_EMBEDDINGS)
        
        # Start batch embedding generation task
        task = batch_generate_embeddings_task.delay(project_id, batch_size)
        
        # Create status record
        status_record = IndexingStatus(
            project_id=project_id,
            task_id=task.id,
            task_type=IndexingTaskType.BATCH_EMBEDDINGS,
            status=IndexingTaskStatus.PENDING,
            metadata={
                "batch_size": batch_size,
                "started_by": current_user.id
            }
        )
        
        created_status = await status_repo.create(status_record)
        
        return {
            "message": "Batch embedding generation started",
            "task_id": task.id,
            "project_id": project_id,
            "batch_size": batch_size,
            "status_id": created_status.id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting batch embedding generation: {e}")
        raise HTTPException(status_code=500, detail="Failed to start batch embedding generation")


@router.post("/projects/{project_id}/indexing/cleanup")
async def start_data_cleanup(
    project_id: str,
    current_user: User = Depends(get_current_user),
    project_repo: ProjectRepository = Depends(get_project_repository),
    status_repo: IndexingStatusRepository = Depends(get_indexing_status_repository)
):
    """
    Start data cleanup task
    """
    try:
        # Verify project ownership
        project = await project_repo.get_by_id(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this project")
        
        # Start data cleanup task
        task = cleanup_orphaned_data_task.delay(project_id)
        
        # Create status record
        status_record = IndexingStatus(
            project_id=project_id,
            task_id=task.id,
            task_type=IndexingTaskType.DATA_CLEANUP,
            status=IndexingTaskStatus.PENDING,
            metadata={
                "started_by": current_user.id
            }
        )
        
        created_status = await status_repo.create(status_record)
        
        return {
            "message": "Data cleanup started",
            "task_id": task.id,
            "project_id": project_id,
            "status_id": created_status.id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting data cleanup: {e}")
        raise HTTPException(status_code=500, detail="Failed to start data cleanup")


@router.get("/projects/{project_id}/indexing/status")
async def get_project_indexing_status(
    project_id: str,
    task_type: Optional[IndexingTaskType] = Query(None, description="Filter by task type"),
    status: Optional[IndexingTaskStatus] = Query(None, description="Filter by status"),
    active_only: bool = Query(False, description="Show only active tasks"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Number of records to return"),
    current_user: User = Depends(get_current_user),
    project_repo: ProjectRepository = Depends(get_project_repository),
    status_repo: IndexingStatusRepository = Depends(get_indexing_status_repository)
) -> List[IndexingStatusResponse]:
    """
    Get indexing status for a project
    """
    try:
        # Verify project ownership
        project = await project_repo.get_by_id(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this project")
        
        # Get status records
        if active_only:
            status_records = await status_repo.get_active_tasks(project_id)
        else:
            status_records = await status_repo.get_by_project(
                project_id, task_type, status, skip, limit
            )
        
        # Convert to response models
        return [
            IndexingStatusResponse(
                id=record.id,
                project_id=record.project_id,
                task_id=record.task_id,
                task_type=record.task_type,
                status=record.status,
                progress=record.progress,
                result=record.result,
                error_message=record.error_message,
                metadata=record.metadata,
                duration_seconds=record.get_duration(),
                started_at=record.started_at,
                completed_at=record.completed_at,
                created_at=record.created_at,
                updated_at=record.updated_at
            )
            for record in status_records
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting project indexing status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get indexing status")


@router.get("/indexing/tasks/{task_id}")
async def get_task_status(
    task_id: str,
    current_user: User = Depends(get_current_user),
    status_repo: IndexingStatusRepository = Depends(get_indexing_status_repository),
    project_repo: ProjectRepository = Depends(get_project_repository)
) -> IndexingStatusResponse:
    """
    Get status of a specific indexing task
    """
    try:
        # Get status record
        status_record = await status_repo.get_by_task_id(task_id)
        if not status_record:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Verify project ownership
        project = await project_repo.get_by_id(status_record.project_id)
        if not project or project.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this task")
        
        # Get real-time task status from Celery
        celery_result = AsyncResult(task_id, app=celery_app)
        
        # Update status if needed
        if celery_result.state and celery_result.state != status_record.status:
            if celery_result.state == 'PENDING':
                await status_repo.update_by_id(status_record.id, {"status": IndexingTaskStatus.PENDING})
            elif celery_result.state == 'STARTED':
                await status_repo.mark_task_started(task_id)
            elif celery_result.state == 'SUCCESS':
                await status_repo.mark_task_completed(task_id, celery_result.result)
            elif celery_result.state == 'FAILURE':
                await status_repo.mark_task_failed(task_id, str(celery_result.info))
            
            # Refresh status record
            status_record = await status_repo.get_by_task_id(task_id)
        
        return IndexingStatusResponse(
            id=status_record.id,
            project_id=status_record.project_id,
            task_id=status_record.task_id,
            task_type=status_record.task_type,
            status=status_record.status,
            progress=status_record.progress,
            result=status_record.result,
            error_message=status_record.error_message,
            metadata=status_record.metadata,
            duration_seconds=status_record.get_duration(),
            started_at=status_record.started_at,
            completed_at=status_record.completed_at,
            created_at=status_record.created_at,
            updated_at=status_record.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting task status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get task status")


@router.post("/indexing/tasks/{task_id}/cancel")
async def cancel_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    status_repo: IndexingStatusRepository = Depends(get_indexing_status_repository),
    project_repo: ProjectRepository = Depends(get_project_repository)
):
    """
    Cancel a running indexing task
    """
    try:
        # Get status record
        status_record = await status_repo.get_by_task_id(task_id)
        if not status_record:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Verify project ownership
        project = await project_repo.get_by_id(status_record.project_id)
        if not project or project.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to cancel this task")
        
        # Check if task can be cancelled
        if not status_record.is_active():
            raise HTTPException(status_code=400, detail="Task is not active and cannot be cancelled")
        
        # Revoke task in Celery
        celery_app.control.revoke(task_id, terminate=True)
        
        # Update status record
        await status_repo.update_by_id(
            status_record.id,
            {
                "status": IndexingTaskStatus.REVOKED,
                "error_message": "Task cancelled by user",
                "completed_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        )
        
        return {"message": "Task cancelled successfully", "task_id": task_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling task: {e}")
        raise HTTPException(status_code=500, detail="Failed to cancel task")


@router.get("/projects/{project_id}/indexing/statistics")
async def get_project_indexing_statistics(
    project_id: str,
    current_user: User = Depends(get_current_user),
    project_repo: ProjectRepository = Depends(get_project_repository),
    status_repo: IndexingStatusRepository = Depends(get_indexing_status_repository)
) -> ProjectIndexingStats:
    """
    Get indexing statistics for a project
    """
    try:
        # Verify project ownership
        project = await project_repo.get_by_id(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this project")
        
        # Get statistics
        stats = await status_repo.get_project_stats(project_id)
        
        return stats
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting project indexing statistics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get indexing statistics")


@router.delete("/projects/{project_id}/indexing/history")
async def clear_indexing_history(
    project_id: str,
    current_user: User = Depends(get_current_user),
    project_repo: ProjectRepository = Depends(get_project_repository),
    status_repo: IndexingStatusRepository = Depends(get_indexing_status_repository)
):
    """
    Clear indexing history for a project (completed tasks only)
    """
    try:
        # Verify project ownership
        project = await project_repo.get_by_id(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this project")
        
        # Delete completed tasks only
        deleted_count = await status_repo.delete_by_filter({
            "project_id": ObjectId(project_id),
            "status": {"$in": [IndexingTaskStatus.SUCCESS, IndexingTaskStatus.FAILURE, IndexingTaskStatus.REVOKED]}
        })
        
        return {
            "message": "Indexing history cleared",
            "deleted_tasks": deleted_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error clearing indexing history: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear indexing history")