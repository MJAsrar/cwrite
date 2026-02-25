"""
Indexing Status Model

This module defines the data model for tracking indexing progress and status.
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from bson import ObjectId
from enum import Enum


class IndexingTaskType(str, Enum):
    """Indexing task type enumeration"""
    DOCUMENT_INDEXING = "document_indexing"
    PROJECT_REINDEXING = "project_reindexing"
    RELATIONSHIP_DISCOVERY = "relationship_discovery"
    BATCH_EMBEDDINGS = "batch_embeddings"
    DATA_CLEANUP = "data_cleanup"


class IndexingTaskStatus(str, Enum):
    """Indexing task status enumeration"""
    PENDING = "pending"
    STARTED = "started"
    PROGRESS = "progress"
    SUCCESS = "success"
    FAILURE = "failure"
    RETRY = "retry"
    REVOKED = "revoked"


class IndexingProgress(BaseModel):
    """Indexing progress information"""
    current: int = 0
    total: int = 100
    percentage: float = 0.0
    status_message: str = ""
    
    @validator('percentage', always=True)
    def calculate_percentage(cls, v, values):
        """Calculate percentage from current and total"""
        current = values.get('current', 0)
        total = values.get('total', 100)
        if total > 0:
            return (current / total) * 100
        return 0.0


class IndexingStatus(BaseModel):
    """Indexing status tracking model"""
    id: Optional[str] = Field(None, alias="_id")
    project_id: str
    task_id: str
    task_type: IndexingTaskType
    status: IndexingTaskStatus
    progress: IndexingProgress = Field(default_factory=IndexingProgress)
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }
    
    @validator('project_id')
    def validate_project_id(cls, v):
        """Validate project ID format"""
        if not ObjectId.is_valid(v):
            raise ValueError('Invalid project ID format')
        return v
    
    @validator('task_id')
    def validate_task_id(cls, v):
        """Validate task ID"""
        if not v or len(v.strip()) == 0:
            raise ValueError('Task ID cannot be empty')
        return v.strip()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for MongoDB storage"""
        data = self.dict(by_alias=True, exclude_none=True)
        
        # Convert string IDs to ObjectId for MongoDB
        if data.get('_id'):
            data['_id'] = ObjectId(data['_id'])
        if data.get('project_id'):
            data['project_id'] = ObjectId(data['project_id'])
        
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'IndexingStatus':
        """Create IndexingStatus instance from MongoDB document"""
        if data.get('_id'):
            data['_id'] = str(data['_id'])
        if data.get('project_id'):
            data['project_id'] = str(data['project_id'])
        
        return cls(**data)
    
    def update_progress(self, current: int, total: int = None, status_message: str = None) -> None:
        """Update progress information"""
        self.progress.current = current
        if total is not None:
            self.progress.total = total
        if status_message is not None:
            self.progress.status_message = status_message
        
        # Recalculate percentage
        if self.progress.total > 0:
            self.progress.percentage = (self.progress.current / self.progress.total) * 100
        
        self.updated_at = datetime.utcnow()
    
    def mark_started(self) -> None:
        """Mark task as started"""
        self.status = IndexingTaskStatus.STARTED
        self.started_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    def mark_completed(self, result: Dict[str, Any] = None) -> None:
        """Mark task as completed successfully"""
        self.status = IndexingTaskStatus.SUCCESS
        self.completed_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        self.progress.current = self.progress.total
        self.progress.percentage = 100.0
        
        if result:
            self.result = result
    
    def mark_failed(self, error_message: str) -> None:
        """Mark task as failed"""
        self.status = IndexingTaskStatus.FAILURE
        self.completed_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        self.error_message = error_message
    
    def get_duration(self) -> Optional[float]:
        """Get task duration in seconds"""
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        elif self.started_at:
            return (datetime.utcnow() - self.started_at).total_seconds()
        return None
    
    def is_active(self) -> bool:
        """Check if task is currently active"""
        return self.status in [IndexingTaskStatus.PENDING, IndexingTaskStatus.STARTED, IndexingTaskStatus.PROGRESS]
    
    def is_completed(self) -> bool:
        """Check if task is completed (success or failure)"""
        return self.status in [IndexingTaskStatus.SUCCESS, IndexingTaskStatus.FAILURE, IndexingTaskStatus.REVOKED]


class IndexingStatusCreate(BaseModel):
    """Indexing status creation model"""
    project_id: str
    task_id: str
    task_type: IndexingTaskType
    metadata: Optional[Dict[str, Any]] = None
    
    @validator('project_id')
    def validate_project_id(cls, v):
        """Validate project ID format"""
        if not ObjectId.is_valid(v):
            raise ValueError('Invalid project ID format')
        return v
    
    @validator('task_id')
    def validate_task_id(cls, v):
        """Validate task ID"""
        if not v or len(v.strip()) == 0:
            raise ValueError('Task ID cannot be empty')
        return v.strip()


class IndexingStatusUpdate(BaseModel):
    """Indexing status update model"""
    status: Optional[IndexingTaskStatus] = None
    progress: Optional[IndexingProgress] = None
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class IndexingStatusResponse(BaseModel):
    """Indexing status response model"""
    id: str
    project_id: str
    task_id: str
    task_type: IndexingTaskType
    status: IndexingTaskStatus
    progress: IndexingProgress
    result: Optional[Dict[str, Any]]
    error_message: Optional[str]
    metadata: Dict[str, Any]
    duration_seconds: Optional[float]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class IndexingStatusFilter(BaseModel):
    """Indexing status filter model"""
    project_id: Optional[str] = None
    task_type: Optional[IndexingTaskType] = None
    status: Optional[IndexingTaskStatus] = None
    active_only: bool = False
    
    @validator('project_id')
    def validate_project_id(cls, v):
        """Validate project ID format"""
        if v and not ObjectId.is_valid(v):
            raise ValueError('Invalid project ID format')
        return v


class ProjectIndexingStats(BaseModel):
    """Project indexing statistics"""
    project_id: str
    total_tasks: int = 0
    active_tasks: int = 0
    completed_tasks: int = 0
    failed_tasks: int = 0
    last_indexing: Optional[datetime] = None
    avg_duration_seconds: Optional[float] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }