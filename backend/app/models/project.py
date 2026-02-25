from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from enum import Enum


class IndexingStatus(str, Enum):
    """Indexing status enumeration"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    ERROR = "error"


class WritingGenre(str, Enum):
    """Writing genre enumeration for genre-specific AI model selection"""
    FANTASY = "fantasy"
    SCI_FI = "sci_fi"
    ROMANCE = "romance"
    THRILLER = "thriller"
    HORROR = "horror"
    LITERARY = "literary"
    HISTORICAL = "historical"
    YOUNG_ADULT = "young_adult"
    POETRY = "poetry"
    SCREENWRITING = "screenwriting"
    GENERAL = "general"


class ProjectSettings(BaseModel):
    """Project settings model"""
    indexing_enabled: bool = True
    entity_extraction_threshold: float = 0.7
    auto_reindex: bool = True
    language: str = "en"
    genre: WritingGenre = WritingGenre.GENERAL
    
    class Config:
        extra = "allow"


class ProjectStats(BaseModel):
    """Project statistics model"""
    file_count: int = 0
    entity_count: int = 0
    total_words: int = 0
    character_count: int = 0
    location_count: int = 0
    theme_count: int = 0
    last_indexed: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class Project(BaseModel):
    """Project model with metadata and settings support"""
    id: Optional[str] = Field(None, alias="_id")
    name: str
    description: Optional[str] = None
    owner_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    settings: ProjectSettings = Field(default_factory=ProjectSettings)
    stats: ProjectStats = Field(default_factory=ProjectStats)
    indexing_status: IndexingStatus = IndexingStatus.PENDING
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }
    
    @validator('name')
    def validate_name(cls, v):
        """Validate project name"""
        if not v or len(v.strip()) == 0:
            raise ValueError('Project name cannot be empty')
        if len(v.strip()) > 100:
            raise ValueError('Project name cannot exceed 100 characters')
        return v.strip()
    
    @validator('description')
    def validate_description(cls, v):
        """Validate project description"""
        if v and len(v) > 1000:
            raise ValueError('Project description cannot exceed 1000 characters')
        return v.strip() if v else None
    
    @validator('owner_id')
    def validate_owner_id(cls, v):
        """Validate owner ID format"""
        if not ObjectId.is_valid(v):
            raise ValueError('Invalid owner ID format')
        return v
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for MongoDB storage"""
        data = self.dict(by_alias=True, exclude_none=True)
        
        # Convert string IDs to ObjectId for MongoDB
        if data.get('_id'):
            data['_id'] = ObjectId(data['_id'])
        if data.get('owner_id'):
            data['owner_id'] = ObjectId(data['owner_id'])
        
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Project':
        """Create Project instance from MongoDB document"""
        if data.get('_id'):
            data['_id'] = str(data['_id'])
        if data.get('owner_id'):
            data['owner_id'] = str(data['owner_id'])
        
        return cls(**data)
    
    def update_stats(self, **kwargs) -> None:
        """Update project statistics"""
        for key, value in kwargs.items():
            if hasattr(self.stats, key):
                setattr(self.stats, key, value)
    
    def increment_stats(self, **kwargs) -> None:
        """Increment project statistics"""
        for key, value in kwargs.items():
            if hasattr(self.stats, key):
                current_value = getattr(self.stats, key, 0)
                setattr(self.stats, key, current_value + value)
    
    def set_indexing_status(self, status: IndexingStatus) -> None:
        """Set indexing status"""
        self.indexing_status = status
        if status == IndexingStatus.COMPLETED:
            self.stats.last_indexed = datetime.utcnow()


class ProjectCreate(BaseModel):
    """Project creation model"""
    name: str
    description: Optional[str] = None
    settings: Optional[ProjectSettings] = None
    
    @validator('name')
    def validate_name(cls, v):
        """Validate project name"""
        if not v or len(v.strip()) == 0:
            raise ValueError('Project name cannot be empty')
        if len(v.strip()) > 100:
            raise ValueError('Project name cannot exceed 100 characters')
        return v.strip()
    
    @validator('description')
    def validate_description(cls, v):
        """Validate project description"""
        if v and len(v) > 1000:
            raise ValueError('Project description cannot exceed 1000 characters')
        return v.strip() if v else None


class ProjectUpdate(BaseModel):
    """Project update model"""
    name: Optional[str] = None
    description: Optional[str] = None
    settings: Optional[ProjectSettings] = None
    
    @validator('name')
    def validate_name(cls, v):
        """Validate project name"""
        if v is not None:
            if len(v.strip()) == 0:
                raise ValueError('Project name cannot be empty')
            if len(v.strip()) > 100:
                raise ValueError('Project name cannot exceed 100 characters')
            return v.strip()
        return v
    
    @validator('description')
    def validate_description(cls, v):
        """Validate project description"""
        if v is not None and len(v) > 1000:
            raise ValueError('Project description cannot exceed 1000 characters')
        return v.strip() if v else None


class ProjectResponse(BaseModel):
    """Project response model"""
    id: str
    name: str
    description: Optional[str]
    owner_id: str
    created_at: datetime
    updated_at: datetime
    settings: ProjectSettings
    stats: ProjectStats
    indexing_status: IndexingStatus
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }