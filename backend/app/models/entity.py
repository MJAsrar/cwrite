from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from bson import ObjectId
from enum import Enum


class EntityType(str, Enum):
    """Entity type enumeration"""
    CHARACTER = "character"
    LOCATION = "location"
    THEME = "theme"


class EntityMention(BaseModel):
    """Entity mention model"""
    file_id: str
    position: int
    context: str
    confidence: float = 1.0
    
    @validator('file_id')
    def validate_file_id(cls, v):
        """Validate file ID format"""
        if not ObjectId.is_valid(v):
            raise ValueError('Invalid file ID format')
        return v
    
    @validator('position')
    def validate_position(cls, v):
        """Validate position"""
        if v < 0:
            raise ValueError('Position cannot be negative')
        return v
    
    @validator('confidence')
    def validate_confidence(cls, v):
        """Validate confidence score"""
        if not 0.0 <= v <= 1.0:
            raise ValueError('Confidence must be between 0.0 and 1.0')
        return v


class Entity(BaseModel):
    """Entity model for characters, locations, and themes"""
    id: Optional[str] = Field(None, alias="_id")
    project_id: str
    type: EntityType
    name: str
    aliases: List[str] = Field(default_factory=list)
    confidence_score: float = 1.0
    mention_count: int = 0
    first_mentioned: Optional[EntityMention] = None
    last_mentioned: Optional[EntityMention] = None
    attributes: Dict[str, Any] = Field(default_factory=dict)
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
    
    @validator('name')
    def validate_name(cls, v):
        """Validate entity name"""
        if not v or len(v.strip()) == 0:
            raise ValueError('Entity name cannot be empty')
        if len(v.strip()) > 200:
            raise ValueError('Entity name cannot exceed 200 characters')
        return v.strip()
    
    @validator('aliases')
    def validate_aliases(cls, v):
        """Validate aliases"""
        if v:
            # Remove duplicates and empty strings
            cleaned_aliases = list(set([alias.strip() for alias in v if alias.strip()]))
            return cleaned_aliases
        return []
    
    @validator('confidence_score')
    def validate_confidence_score(cls, v):
        """Validate confidence score"""
        if not 0.0 <= v <= 1.0:
            raise ValueError('Confidence score must be between 0.0 and 1.0')
        return v
    
    @validator('mention_count')
    def validate_mention_count(cls, v):
        """Validate mention count"""
        if v < 0:
            raise ValueError('Mention count cannot be negative')
        return v
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for MongoDB storage"""
        data = self.dict(by_alias=True, exclude_none=True)
        
        # Convert string IDs to ObjectId for MongoDB
        if data.get('_id'):
            data['_id'] = ObjectId(data['_id'])
        if data.get('project_id'):
            data['project_id'] = ObjectId(data['project_id'])
        
        # Convert mention file_ids to ObjectId
        if data.get('first_mentioned', {}).get('file_id'):
            data['first_mentioned']['file_id'] = ObjectId(data['first_mentioned']['file_id'])
        if data.get('last_mentioned', {}).get('file_id'):
            data['last_mentioned']['file_id'] = ObjectId(data['last_mentioned']['file_id'])
        
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Entity':
        """Create Entity instance from MongoDB document"""
        if data.get('_id'):
            data['_id'] = str(data['_id'])
        if data.get('project_id'):
            data['project_id'] = str(data['project_id'])
        
        # Convert mention file_ids to string
        if data.get('first_mentioned', {}).get('file_id'):
            data['first_mentioned']['file_id'] = str(data['first_mentioned']['file_id'])
        if data.get('last_mentioned', {}).get('file_id'):
            data['last_mentioned']['file_id'] = str(data['last_mentioned']['file_id'])
        
        return cls(**data)
    
    def add_mention(self, mention: EntityMention) -> None:
        """Add a mention to the entity"""
        self.mention_count += 1
        
        if self.first_mentioned is None:
            self.first_mentioned = mention
        
        self.last_mentioned = mention
    
    def add_alias(self, alias: str) -> None:
        """Add an alias to the entity"""
        alias = alias.strip()
        if alias and alias not in self.aliases and alias != self.name:
            self.aliases.append(alias)
    
    def update_confidence(self, new_confidence: float) -> None:
        """Update confidence score using weighted average"""
        if 0.0 <= new_confidence <= 1.0:
            # Weighted average with current confidence
            weight = 0.7  # Weight for existing confidence
            self.confidence_score = (weight * self.confidence_score + 
                                   (1 - weight) * new_confidence)
    
    def set_attribute(self, key: str, value: Any) -> None:
        """Set entity attribute"""
        self.attributes[key] = value
    
    def get_attribute(self, key: str, default: Any = None) -> Any:
        """Get entity attribute"""
        return self.attributes.get(key, default)


class EntityCreate(BaseModel):
    """Entity creation model"""
    project_id: str
    type: EntityType
    name: str
    aliases: Optional[List[str]] = None
    confidence_score: float = 1.0
    attributes: Optional[Dict[str, Any]] = None
    
    @validator('project_id')
    def validate_project_id(cls, v):
        """Validate project ID format"""
        if not ObjectId.is_valid(v):
            raise ValueError('Invalid project ID format')
        return v
    
    @validator('name')
    def validate_name(cls, v):
        """Validate entity name"""
        if not v or len(v.strip()) == 0:
            raise ValueError('Entity name cannot be empty')
        return v.strip()


class EntityUpdate(BaseModel):
    """Entity update model"""
    name: Optional[str] = None
    aliases: Optional[List[str]] = None
    confidence_score: Optional[float] = None
    attributes: Optional[Dict[str, Any]] = None
    
    @validator('name')
    def validate_name(cls, v):
        """Validate entity name"""
        if v is not None and len(v.strip()) == 0:
            raise ValueError('Entity name cannot be empty')
        return v.strip() if v else None
    
    @validator('confidence_score')
    def validate_confidence_score(cls, v):
        """Validate confidence score"""
        if v is not None and not 0.0 <= v <= 1.0:
            raise ValueError('Confidence score must be between 0.0 and 1.0')
        return v


class EntityResponse(BaseModel):
    """Entity response model"""
    id: str
    project_id: str
    type: EntityType
    name: str
    aliases: List[str]
    confidence_score: float
    mention_count: int
    first_mentioned: Optional[EntityMention]
    last_mentioned: Optional[EntityMention]
    attributes: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class EntityFilter(BaseModel):
    """Entity filter model"""
    project_id: Optional[str] = None
    type: Optional[EntityType] = None
    name_contains: Optional[str] = None
    min_confidence: Optional[float] = None
    min_mentions: Optional[int] = None
    
    @validator('project_id')
    def validate_project_id(cls, v):
        """Validate project ID format"""
        if v and not ObjectId.is_valid(v):
            raise ValueError('Invalid project ID format')
        return v