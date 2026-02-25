from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from bson import ObjectId


class TextChunk(BaseModel):
    """TextChunk model for semantic search"""
    id: Optional[str] = Field(None, alias="_id")
    file_id: str
    project_id: str
    content: str
    start_position: int
    end_position: int
    chunk_index: int
    word_count: int
    embedding_vector: Optional[List[float]] = None
    entities_mentioned: List[str] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }
    
    @validator('file_id')
    def validate_file_id(cls, v):
        """Validate file ID format"""
        if not ObjectId.is_valid(v):
            raise ValueError('Invalid file ID format')
        return v
    
    @validator('project_id')
    def validate_project_id(cls, v):
        """Validate project ID format"""
        if not ObjectId.is_valid(v):
            raise ValueError('Invalid project ID format')
        return v
    
    @validator('content')
    def validate_content(cls, v):
        """Validate content"""
        if not v or len(v.strip()) == 0:
            raise ValueError('Content cannot be empty')
        if len(v) > 10000:  # 10KB limit per chunk
            raise ValueError('Content cannot exceed 10000 characters')
        return v.strip()
    
    @validator('start_position')
    def validate_start_position(cls, v):
        """Validate start position"""
        if v < 0:
            raise ValueError('Start position cannot be negative')
        return v
    
    @validator('end_position')
    def validate_end_position(cls, v, values):
        """Validate end position"""
        if v < 0:
            raise ValueError('End position cannot be negative')
        if 'start_position' in values and v <= values['start_position']:
            raise ValueError('End position must be greater than start position')
        return v
    
    @validator('chunk_index')
    def validate_chunk_index(cls, v):
        """Validate chunk index"""
        if v < 0:
            raise ValueError('Chunk index cannot be negative')
        return v
    
    @validator('word_count')
    def validate_word_count(cls, v):
        """Validate word count"""
        if v < 0:
            raise ValueError('Word count cannot be negative')
        return v
    
    @validator('embedding_vector')
    def validate_embedding_vector(cls, v):
        """Validate embedding vector"""
        if v is not None:
            if not isinstance(v, list):
                raise ValueError('Embedding vector must be a list')
            if len(v) != 384:  # all-MiniLM-L6-v2 dimension
                raise ValueError('Embedding vector must have 384 dimensions')
            if not all(isinstance(x, (int, float)) for x in v):
                raise ValueError('Embedding vector must contain only numbers')
        return v
    
    @validator('entities_mentioned')
    def validate_entities_mentioned(cls, v):
        """Validate entities mentioned"""
        if v:
            # Validate all entity IDs
            for entity_id in v:
                if not ObjectId.is_valid(entity_id):
                    raise ValueError(f'Invalid entity ID format: {entity_id}')
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
        if data.get('entities_mentioned'):
            data['entities_mentioned'] = [ObjectId(eid) for eid in data['entities_mentioned']]
        
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TextChunk':
        """Create TextChunk instance from MongoDB document"""
        if data.get('_id'):
            data['_id'] = str(data['_id'])
        if data.get('file_id'):
            data['file_id'] = str(data['file_id'])
        if data.get('project_id'):
            data['project_id'] = str(data['project_id'])
        if data.get('entities_mentioned'):
            data['entities_mentioned'] = [str(eid) for eid in data['entities_mentioned']]
        
        return cls(**data)
    
    def add_entity_mention(self, entity_id: str) -> None:
        """Add entity mention to chunk"""
        if ObjectId.is_valid(entity_id) and entity_id not in self.entities_mentioned:
            self.entities_mentioned.append(entity_id)
    
    def remove_entity_mention(self, entity_id: str) -> None:
        """Remove entity mention from chunk"""
        if entity_id in self.entities_mentioned:
            self.entities_mentioned.remove(entity_id)
    
    def set_embedding(self, embedding: List[float]) -> None:
        """Set embedding vector"""
        if len(embedding) != 384:
            raise ValueError('Embedding vector must have 384 dimensions')
        self.embedding_vector = embedding
    
    def get_text_snippet(self, max_length: int = 200) -> str:
        """Get text snippet for display"""
        if len(self.content) <= max_length:
            return self.content
        return self.content[:max_length] + "..."
    
    def calculate_word_count(self) -> int:
        """Calculate and update word count"""
        words = self.content.split()
        self.word_count = len(words)
        return self.word_count


class TextChunkCreate(BaseModel):
    """TextChunk creation model"""
    file_id: str
    project_id: str
    content: str
    start_position: int
    end_position: int
    chunk_index: int
    word_count: Optional[int] = None
    embedding_vector: Optional[List[float]] = None
    entities_mentioned: List[str] = Field(default_factory=list)
    
    @validator('file_id')
    def validate_file_id(cls, v):
        """Validate file ID format"""
        if not ObjectId.is_valid(v):
            raise ValueError('Invalid file ID format')
        return v
    
    @validator('project_id')
    def validate_project_id(cls, v):
        """Validate project ID format"""
        if not ObjectId.is_valid(v):
            raise ValueError('Invalid project ID format')
        return v
    
    @validator('content')
    def validate_content(cls, v):
        """Validate content"""
        if not v or len(v.strip()) == 0:
            raise ValueError('Content cannot be empty')
        return v.strip()
    
    @validator('word_count')
    def validate_word_count(cls, v, values):
        """Validate and calculate word count if not provided"""
        if v is None and 'content' in values:
            return len(values['content'].split())
        if v is not None and v < 0:
            raise ValueError('Word count cannot be negative')
        return v
    
    @validator('embedding_vector')
    def validate_embedding_vector(cls, v):
        """Validate embedding vector"""
        if v is not None:
            if not isinstance(v, list):
                raise ValueError('Embedding vector must be a list')
            if len(v) != 384:  # all-MiniLM-L6-v2 dimension
                raise ValueError('Embedding vector must have 384 dimensions')
            if not all(isinstance(x, (int, float)) for x in v):
                raise ValueError('Embedding vector must contain only numbers')
        return v
    
    @validator('entities_mentioned')
    def validate_entities_mentioned(cls, v):
        """Validate entities mentioned"""
        if v:
            # Validate all entity IDs
            for entity_id in v:
                if not ObjectId.is_valid(entity_id):
                    raise ValueError(f'Invalid entity ID format: {entity_id}')
        return v


class TextChunkResponse(BaseModel):
    """TextChunk response model"""
    id: str
    file_id: str
    project_id: str
    content: str
    start_position: int
    end_position: int
    chunk_index: int
    word_count: int
    entities_mentioned: List[str]
    created_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ChunkSearchResult(BaseModel):
    """Chunk search result model"""
    chunk_id: str
    file_id: str
    content: str
    relevance_score: float
    highlights: List[str] = Field(default_factory=list)
    entities_mentioned: List[str] = Field(default_factory=list)
    
    @validator('relevance_score')
    def validate_relevance_score(cls, v):
        """Validate relevance score"""
        if not 0.0 <= v <= 1.0:
            raise ValueError('Relevance score must be between 0.0 and 1.0')
        return v