from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any
from datetime import datetime
from bson import ObjectId


class PositionIndex(BaseModel):
    """Position index model for line-by-line file indexing"""
    id: Optional[str] = Field(None, alias="_id")
    file_id: str
    project_id: str
    
    # Line tracking
    line_number: int
    start_char_pos: int
    end_char_pos: int
    
    # Structural hierarchy
    paragraph_number: int
    scene_id: Optional[str] = None
    chapter_number: Optional[int] = None
    
    # Line content and metadata
    line_content: str
    line_length: int
    word_count: int
    is_empty: bool = False
    is_dialogue: bool = False
    
    created_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }
    
    @validator('file_id', 'project_id')
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
    
    @validator('line_number', 'start_char_pos', 'end_char_pos', 'paragraph_number', 'line_length', 'word_count')
    def validate_non_negative(cls, v):
        """Validate non-negative integers"""
        if v < 0:
            raise ValueError('Value cannot be negative')
        return v
    
    @validator('chapter_number')
    def validate_chapter(cls, v):
        """Validate chapter number"""
        if v is not None and v < 1:
            raise ValueError('Chapter number must be at least 1')
        return v
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for MongoDB storage"""
        data = self.dict(by_alias=True, exclude_none=True)
        
        # Convert string IDs to ObjectId for MongoDB
        if data.get('_id'):
            data['_id'] = ObjectId(data['_id'])
        if data.get('file_id'):
            data['file_id'] = ObjectId(data['file_id'])
        if data.get('project_id'):
            data['project_id'] = ObjectId(data['project_id'])
        if data.get('scene_id'):
            data['scene_id'] = ObjectId(data['scene_id'])
        
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'PositionIndex':
        """Create PositionIndex instance from MongoDB document"""
        if data.get('_id'):
            data['_id'] = str(data['_id'])
        if data.get('file_id'):
            data['file_id'] = str(data['file_id'])
        if data.get('project_id'):
            data['project_id'] = str(data['project_id'])
        if data.get('scene_id'):
            data['scene_id'] = str(data['scene_id'])
        
        return cls(**data)


class PositionIndexCreate(BaseModel):
    """Position index creation model"""
    file_id: str
    project_id: str
    line_number: int
    start_char_pos: int
    end_char_pos: int
    paragraph_number: int
    line_content: str
    scene_id: Optional[str] = None
    chapter_number: Optional[int] = None
    
    @validator('file_id', 'project_id')
    def validate_required_id(cls, v):
        """Validate required ObjectId format"""
        if not ObjectId.is_valid(v):
            raise ValueError('Invalid ID format')
        return v


class PositionIndexResponse(BaseModel):
    """Position index response model"""
    id: str
    file_id: str
    project_id: str
    line_number: int
    start_char_pos: int
    end_char_pos: int
    paragraph_number: int
    scene_id: Optional[str]
    chapter_number: Optional[int]
    line_content: str
    line_length: int
    word_count: int
    is_empty: bool
    is_dialogue: bool
    created_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class LineQuery(BaseModel):
    """Model for querying lines by position"""
    file_id: str
    line_number: Optional[int] = None
    scene_id: Optional[str] = None
    chapter_number: Optional[int] = None
    start_line: Optional[int] = None
    end_line: Optional[int] = None
    
    @validator('file_id')
    def validate_file_id(cls, v):
        """Validate file ID format"""
        if not ObjectId.is_valid(v):
            raise ValueError('Invalid file ID format')
        return v


