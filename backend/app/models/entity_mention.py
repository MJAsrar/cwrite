from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any
from datetime import datetime
from bson import ObjectId


class DetailedEntityMention(BaseModel):
    """Detailed entity mention model with precise position tracking"""
    id: Optional[str] = Field(None, alias="_id")
    entity_id: str
    project_id: str
    file_id: str
    
    # Precise position tracking
    start_char_pos: int
    end_char_pos: int
    line_number: int
    paragraph_number: int
    scene_id: Optional[str] = None
    
    # Mention details
    mention_text: str  # The actual text found (e.g., "Marcus", "he")
    mention_index: int  # 1st, 2nd, 3rd... mention in the file
    
    # Context
    context_before: str = ""  # 100 chars before
    context_after: str = ""   # 100 chars after
    full_sentence: Optional[str] = None
    
    # Analysis
    is_direct_mention: bool = True  # vs pronoun reference
    confidence: float = 1.0
    
    created_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }
    
    @validator('entity_id', 'project_id', 'file_id')
    def validate_required_id(cls, v):
        """Validate required ObjectId format"""
        if not ObjectId.is_valid(v):
            raise ValueError('Invalid ID format')
        return v
    
    @validator('scene_id')
    def validate_optional_id(cls, v):
        """Validate optional ObjectId format"""
        if v is not None and not ObjectId.is_valid(v):
            raise ValueError('Invalid scene ID format')
        return v
    
    @validator('start_char_pos', 'end_char_pos', 'line_number', 'paragraph_number', 'mention_index')
    def validate_positive(cls, v):
        """Validate positive integers"""
        if v < 0:
            raise ValueError('Value cannot be negative')
        return v
    
    @validator('mention_text')
    def validate_mention_text(cls, v):
        """Validate mention text"""
        if not v or len(v.strip()) == 0:
            raise ValueError('Mention text cannot be empty')
        return v.strip()
    
    @validator('confidence')
    def validate_confidence(cls, v):
        """Validate confidence score"""
        if not 0.0 <= v <= 1.0:
            raise ValueError('Confidence must be between 0.0 and 1.0')
        return v
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for MongoDB storage"""
        data = self.dict(by_alias=True, exclude_none=True)
        
        # Convert string IDs to ObjectId for MongoDB
        if data.get('_id'):
            data['_id'] = ObjectId(data['_id'])
        if data.get('entity_id'):
            data['entity_id'] = ObjectId(data['entity_id'])
        if data.get('project_id'):
            data['project_id'] = ObjectId(data['project_id'])
        if data.get('file_id'):
            data['file_id'] = ObjectId(data['file_id'])
        if data.get('scene_id'):
            data['scene_id'] = ObjectId(data['scene_id'])
        
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'DetailedEntityMention':
        """Create DetailedEntityMention instance from MongoDB document"""
        if data.get('_id'):
            data['_id'] = str(data['_id'])
        if data.get('entity_id'):
            data['entity_id'] = str(data['entity_id'])
        if data.get('project_id'):
            data['project_id'] = str(data['project_id'])
        if data.get('file_id'):
            data['file_id'] = str(data['file_id'])
        if data.get('scene_id'):
            data['scene_id'] = str(data['scene_id'])
        
        return cls(**data)


class EntityMentionCreate(BaseModel):
    """Entity mention creation model"""
    entity_id: str
    project_id: str
    file_id: str
    start_char_pos: int
    end_char_pos: int
    line_number: int
    paragraph_number: int
    mention_text: str
    mention_index: int
    scene_id: Optional[str] = None
    context_before: str = ""
    context_after: str = ""
    full_sentence: Optional[str] = None
    is_direct_mention: bool = True
    confidence: float = 1.0
    
    @validator('entity_id', 'project_id', 'file_id')
    def validate_required_id(cls, v):
        """Validate required ObjectId format"""
        if not ObjectId.is_valid(v):
            raise ValueError('Invalid ID format')
        return v


class EntityMentionResponse(BaseModel):
    """Entity mention response model"""
    id: str
    entity_id: str
    project_id: str
    file_id: str
    start_char_pos: int
    end_char_pos: int
    line_number: int
    paragraph_number: int
    scene_id: Optional[str]
    mention_text: str
    mention_index: int
    context_before: str
    context_after: str
    full_sentence: Optional[str]
    is_direct_mention: bool
    confidence: float
    created_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


