from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from bson import ObjectId
from enum import Enum


class RelationshipType(str, Enum):
    """Relationship type enumeration"""
    APPEARS_WITH = "appears_with"
    LOCATED_IN = "located_in"
    RELATED_TO = "related_to"
    MENTIONS = "mentions"
    INTERACTS_WITH = "interacts_with"
    BELONGS_TO = "belongs_to"


class Relationship(BaseModel):
    """Relationship model for entity connections"""
    id: Optional[str] = Field(None, alias="_id")
    project_id: str
    source_entity_id: str
    target_entity_id: str
    relationship_type: RelationshipType
    strength: float = 0.0
    co_occurrence_count: int = 0
    context_snippets: List[str] = Field(default_factory=list)
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
    
    @validator('source_entity_id')
    def validate_source_entity_id(cls, v):
        """Validate source entity ID format"""
        if not ObjectId.is_valid(v):
            raise ValueError('Invalid source entity ID format')
        return v
    
    @validator('target_entity_id')
    def validate_target_entity_id(cls, v, values):
        """Validate target entity ID format"""
        if not ObjectId.is_valid(v):
            raise ValueError('Invalid target entity ID format')
        
        # Ensure source and target are different
        if 'source_entity_id' in values and v == values['source_entity_id']:
            raise ValueError('Source and target entity IDs cannot be the same')
        
        return v
    
    @validator('strength')
    def validate_strength(cls, v):
        """Validate relationship strength"""
        if not 0.0 <= v <= 1.0:
            raise ValueError('Relationship strength must be between 0.0 and 1.0')
        return v
    
    @validator('co_occurrence_count')
    def validate_co_occurrence_count(cls, v):
        """Validate co-occurrence count"""
        if v < 0:
            raise ValueError('Co-occurrence count cannot be negative')
        return v
    
    @validator('context_snippets')
    def validate_context_snippets(cls, v):
        """Validate context snippets"""
        if v:
            # Limit number of snippets and their length
            max_snippets = 10
            max_snippet_length = 500
            
            if len(v) > max_snippets:
                v = v[:max_snippets]
            
            cleaned_snippets = []
            for snippet in v:
                if isinstance(snippet, str) and snippet.strip():
                    cleaned_snippet = snippet.strip()
                    if len(cleaned_snippet) > max_snippet_length:
                        cleaned_snippet = cleaned_snippet[:max_snippet_length] + "..."
                    cleaned_snippets.append(cleaned_snippet)
            
            return cleaned_snippets
        return []
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for MongoDB storage"""
        data = self.dict(by_alias=True, exclude_none=True)
        
        # Convert string IDs to ObjectId for MongoDB
        if data.get('_id'):
            data['_id'] = ObjectId(data['_id'])
        if data.get('project_id'):
            data['project_id'] = ObjectId(data['project_id'])
        if data.get('source_entity_id'):
            data['source_entity_id'] = ObjectId(data['source_entity_id'])
        if data.get('target_entity_id'):
            data['target_entity_id'] = ObjectId(data['target_entity_id'])
        
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Relationship':
        """Create Relationship instance from MongoDB document"""
        if data.get('_id'):
            data['_id'] = str(data['_id'])
        if data.get('project_id'):
            data['project_id'] = str(data['project_id'])
        if data.get('source_entity_id'):
            data['source_entity_id'] = str(data['source_entity_id'])
        if data.get('target_entity_id'):
            data['target_entity_id'] = str(data['target_entity_id'])
        
        return cls(**data)
    
    def increment_co_occurrence(self, context: Optional[str] = None) -> None:
        """Increment co-occurrence count and add context"""
        self.co_occurrence_count += 1
        
        if context and context.strip():
            # Add context snippet if not already present
            context = context.strip()
            if context not in self.context_snippets:
                self.context_snippets.append(context)
                # Keep only the most recent snippets
                if len(self.context_snippets) > 10:
                    self.context_snippets = self.context_snippets[-10:]
        
        # Update strength based on co-occurrence count
        self.update_strength()
    
    def update_strength(self) -> None:
        """Update relationship strength based on co-occurrence count"""
        # Simple strength calculation based on co-occurrence frequency
        # Can be enhanced with more sophisticated algorithms
        if self.co_occurrence_count == 0:
            self.strength = 0.0
        elif self.co_occurrence_count == 1:
            self.strength = 0.1
        elif self.co_occurrence_count <= 5:
            self.strength = min(0.5, self.co_occurrence_count * 0.1)
        else:
            # Logarithmic scaling for higher counts
            import math
            self.strength = min(1.0, 0.5 + 0.1 * math.log(self.co_occurrence_count - 4))
    
    def add_context_snippet(self, snippet: str) -> None:
        """Add context snippet"""
        if snippet and snippet.strip():
            snippet = snippet.strip()
            if snippet not in self.context_snippets:
                self.context_snippets.append(snippet)
                # Keep only the most recent snippets
                if len(self.context_snippets) > 10:
                    self.context_snippets = self.context_snippets[-10:]
    
    def get_reverse_relationship_type(self) -> RelationshipType:
        """Get the reverse relationship type"""
        reverse_mapping = {
            RelationshipType.APPEARS_WITH: RelationshipType.APPEARS_WITH,
            RelationshipType.LOCATED_IN: RelationshipType.MENTIONS,
            RelationshipType.RELATED_TO: RelationshipType.RELATED_TO,
            RelationshipType.MENTIONS: RelationshipType.LOCATED_IN,
            RelationshipType.INTERACTS_WITH: RelationshipType.INTERACTS_WITH,
            RelationshipType.BELONGS_TO: RelationshipType.MENTIONS,
        }
        return reverse_mapping.get(self.relationship_type, RelationshipType.RELATED_TO)


class RelationshipCreate(BaseModel):
    """Relationship creation model"""
    project_id: str
    source_entity_id: str
    target_entity_id: str
    relationship_type: RelationshipType
    context_snippet: Optional[str] = None
    
    @validator('project_id')
    def validate_project_id(cls, v):
        """Validate project ID format"""
        if not ObjectId.is_valid(v):
            raise ValueError('Invalid project ID format')
        return v
    
    @validator('source_entity_id')
    def validate_source_entity_id(cls, v):
        """Validate source entity ID format"""
        if not ObjectId.is_valid(v):
            raise ValueError('Invalid source entity ID format')
        return v
    
    @validator('target_entity_id')
    def validate_target_entity_id(cls, v, values):
        """Validate target entity ID format"""
        if not ObjectId.is_valid(v):
            raise ValueError('Invalid target entity ID format')
        
        # Ensure source and target are different
        if 'source_entity_id' in values and v == values['source_entity_id']:
            raise ValueError('Source and target entity IDs cannot be the same')
        
        return v


class RelationshipUpdate(BaseModel):
    """Relationship update model"""
    relationship_type: Optional[RelationshipType] = None
    strength: Optional[float] = None
    context_snippet: Optional[str] = None
    
    @validator('strength')
    def validate_strength(cls, v):
        """Validate relationship strength"""
        if v is not None and not 0.0 <= v <= 1.0:
            raise ValueError('Relationship strength must be between 0.0 and 1.0')
        return v


class RelationshipResponse(BaseModel):
    """Relationship response model"""
    id: str
    project_id: str
    source_entity_id: str
    target_entity_id: str
    source_entity_name: Optional[str] = None
    target_entity_name: Optional[str] = None
    relationship_type: RelationshipType
    strength: float
    co_occurrence_count: int
    context_snippets: List[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class RelationshipFilter(BaseModel):
    """Relationship filter model"""
    project_id: Optional[str] = None
    source_entity_id: Optional[str] = None
    target_entity_id: Optional[str] = None
    relationship_type: Optional[RelationshipType] = None
    min_strength: Optional[float] = None
    min_co_occurrence: Optional[int] = None
    
    @validator('project_id')
    def validate_project_id(cls, v):
        """Validate project ID format"""
        if v and not ObjectId.is_valid(v):
            raise ValueError('Invalid project ID format')
        return v
    
    @validator('source_entity_id')
    def validate_source_entity_id(cls, v):
        """Validate source entity ID format"""
        if v and not ObjectId.is_valid(v):
            raise ValueError('Invalid source entity ID format')
        return v
    
    @validator('target_entity_id')
    def validate_target_entity_id(cls, v):
        """Validate target entity ID format"""
        if v and not ObjectId.is_valid(v):
            raise ValueError('Invalid target entity ID format')
        return v