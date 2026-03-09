from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from bson import ObjectId
import hashlib


class SearchLog(BaseModel):
    """Search log model for tracking search queries"""
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    project_id: Optional[str] = None
    query: str
    query_hash: str
    result_count: int = 0
    response_time_ms: int = 0
    clicked_results: List[str] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }
    
    @validator('user_id')
    def validate_user_id(cls, v):
        """Validate user ID format"""
        if not ObjectId.is_valid(v):
            raise ValueError('Invalid user ID format')
        return v
    
    @validator('project_id')
    def validate_project_id(cls, v):
        """Validate project ID format"""
        if v and not ObjectId.is_valid(v):
            raise ValueError('Invalid project ID format')
        return v
    
    @validator('query')
    def validate_query(cls, v):
        """Validate search query"""
        if not v or len(v.strip()) == 0:
            raise ValueError('Query cannot be empty')
        if len(v) > 1000:
            raise ValueError('Query cannot exceed 1000 characters')
        return v.strip()
    
    @validator('result_count')
    def validate_result_count(cls, v):
        """Validate result count"""
        if v < 0:
            raise ValueError('Result count cannot be negative')
        return v
    
    @validator('response_time_ms')
    def validate_response_time_ms(cls, v):
        """Validate response time"""
        if v < 0:
            raise ValueError('Response time cannot be negative')
        return v
    
    @validator('clicked_results')
    def validate_clicked_results(cls, v):
        """Validate clicked results"""
        if v:
            # Validate all result IDs
            for result_id in v:
                if not ObjectId.is_valid(result_id):
                    raise ValueError(f'Invalid result ID format: {result_id}')
        return v
    
    def __init__(self, **data):
        """Initialize search log with auto-generated query hash"""
        if 'query_hash' not in data and 'query' in data:
            data['query_hash'] = self.generate_query_hash(data['query'])
        super().__init__(**data)
    
    @staticmethod
    def generate_query_hash(query: str) -> str:
        """Generate hash for query caching"""
        normalized_query = query.lower().strip()
        return hashlib.md5(normalized_query.encode('utf-8')).hexdigest()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for MongoDB storage"""
        data = self.dict(by_alias=True, exclude_none=True)
        
        # Convert string IDs to ObjectId for MongoDB
        if data.get('_id'):
            data['_id'] = ObjectId(data['_id'])
        if data.get('user_id'):
            data['user_id'] = ObjectId(data['user_id'])
        if data.get('project_id'):
            data['project_id'] = ObjectId(data['project_id'])
        if data.get('clicked_results'):
            data['clicked_results'] = [ObjectId(rid) for rid in data['clicked_results']]
        
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SearchLog':
        """Create SearchLog instance from MongoDB document"""
        if data.get('_id'):
            data['_id'] = str(data['_id'])
        if data.get('user_id'):
            data['user_id'] = str(data['user_id'])
        if data.get('project_id'):
            data['project_id'] = str(data['project_id'])
        if data.get('clicked_results'):
            data['clicked_results'] = [str(rid) for rid in data['clicked_results']]
        
        return cls(**data)
    
    def add_clicked_result(self, result_id: str) -> None:
        """Add clicked result ID"""
        if ObjectId.is_valid(result_id) and result_id not in self.clicked_results:
            self.clicked_results.append(result_id)


class SearchLogCreate(BaseModel):
    """Search log creation model"""
    user_id: str
    project_id: Optional[str] = None
    query: str
    result_count: int = 0
    response_time_ms: int = 0
    
    @validator('user_id')
    def validate_user_id(cls, v):
        """Validate user ID format"""
        if not ObjectId.is_valid(v):
            raise ValueError('Invalid user ID format')
        return v
    
    @validator('project_id')
    def validate_project_id(cls, v):
        """Validate project ID format"""
        if v and not ObjectId.is_valid(v):
            raise ValueError('Invalid project ID format')
        return v
    
    @validator('query')
    def validate_query(cls, v):
        """Validate search query"""
        if not v or len(v.strip()) == 0:
            raise ValueError('Query cannot be empty')
        return v.strip()


class SearchLogResponse(BaseModel):
    """Search log response model"""
    id: str
    user_id: str
    project_id: Optional[str]
    query: str
    result_count: int
    response_time_ms: int
    clicked_results: List[str]
    created_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }