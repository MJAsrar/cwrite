from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId
from enum import Enum


class SceneBreakType(str, Enum):
    """Scene break type enumeration"""
    EXPLICIT = "explicit"  # ***, ---, ###, etc.
    IMPLICIT = "implicit"  # Detected via heuristics
    CHAPTER = "chapter"    # Chapter boundary


class Scene(BaseModel):
    """Scene model for tracking narrative scenes"""
    id: Optional[str] = Field(None, alias="_id")
    file_id: str
    project_id: str
    scene_number: int
    chapter_number: Optional[int] = None
    
    # Position tracking
    start_char_pos: int
    end_char_pos: int
    start_line: int
    end_line: int
    
    # Scene metadata
    break_type: SceneBreakType
    characters_present: List[str] = Field(default_factory=list)  # Entity IDs
    location: Optional[str] = None
    time_marker: Optional[str] = None  # "The next day", "Morning", etc.
    
    # Content analysis
    word_count: int = 0
    paragraph_count: int = 0
    dialogue_percentage: float = 0.0  # 0.0 to 1.0
    
    # Optional enrichment (can be added later with LLM)
    summary: Optional[str] = None
    
    # Phase 2: POV Analysis
    pov_type: Optional[str] = None  # first_person, third_person_limited, etc.
    pov_character: Optional[str] = None  # Entity ID or name
    pov_confidence: Optional[float] = None
    pov_shifts: List[Dict[str, Any]] = Field(default_factory=list)  # POV changes within scene
    
    # Phase 2: Timeline Analysis
    time_markers: List[str] = Field(default_factory=list)  # Extracted time references
    is_flashback: bool = False
    temporal_order: Optional[int] = None  # Chronological order (may differ from scene_number)
    story_time: Optional[str] = None  # Estimated time in story timeline
    
    # Phase 2: Scene Type & Characteristics
    scene_type: Optional[str] = None  # action, dialogue, description, introspection, etc.
    scene_significance: Optional[str] = None  # opening, climax, cliffhanger, etc.
    characteristics: List[str] = Field(default_factory=list)  # fast-paced, dialogue-heavy, etc.
    emotional_tone: List[str] = Field(default_factory=list)  # happy, tense, mysterious, etc.
    
    # Phase 2: Additional Metrics
    avg_sentence_length: Optional[float] = None
    tension_level: Optional[str] = None  # low, medium, high
    mood: Optional[str] = None
    
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }
    
    @validator('file_id', 'project_id')
    def validate_object_id(cls, v):
        """Validate ObjectId format"""
        if not ObjectId.is_valid(v):
            raise ValueError('Invalid ID format')
        return v
    
    @validator('scene_number', 'start_line', 'end_line', 'start_char_pos', 'end_char_pos', 'word_count', 'paragraph_count')
    def validate_positive(cls, v):
        """Validate positive integers"""
        if v < 0:
            raise ValueError('Value cannot be negative')
        return v
    
    @validator('chapter_number')
    def validate_chapter(cls, v):
        """Validate chapter number"""
        if v is not None and v < 1:
            raise ValueError('Chapter number must be at least 1')
        return v
    
    @validator('dialogue_percentage')
    def validate_dialogue_percentage(cls, v):
        """Validate dialogue percentage"""
        if not 0.0 <= v <= 1.0:
            raise ValueError('Dialogue percentage must be between 0.0 and 1.0')
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
        
        # Convert entity IDs in lists
        if data.get('characters_present'):
            data['characters_present'] = [ObjectId(eid) if ObjectId.is_valid(eid) else eid 
                                         for eid in data['characters_present']]
        
        if data.get('pov_character') and ObjectId.is_valid(data['pov_character']):
            data['pov_character'] = ObjectId(data['pov_character'])
        
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Scene':
        """Create Scene instance from MongoDB document"""
        if data.get('_id'):
            data['_id'] = str(data['_id'])
        if data.get('file_id'):
            data['file_id'] = str(data['file_id'])
        if data.get('project_id'):
            data['project_id'] = str(data['project_id'])
        
        # Convert entity IDs to strings
        if data.get('characters_present'):
            data['characters_present'] = [str(eid) for eid in data['characters_present']]
        
        if data.get('pov_character'):
            data['pov_character'] = str(data['pov_character'])
        
        return cls(**data)
    
    def add_character(self, entity_id: str) -> None:
        """Add a character to the scene"""
        if entity_id not in self.characters_present:
            self.characters_present.append(entity_id)
    
    def calculate_stats(self, text: str) -> None:
        """Calculate scene statistics from text"""
        self.word_count = len(text.split())
        self.paragraph_count = len([p for p in text.split('\n\n') if p.strip()])
        
        # Simple dialogue detection (count quoted text)
        import re
        dialogue_chars = len(re.findall(r'"[^"]*"', text))
        total_chars = len(text)
        self.dialogue_percentage = dialogue_chars / total_chars if total_chars > 0 else 0.0


class SceneCreate(BaseModel):
    """Scene creation model"""
    file_id: str
    project_id: str
    scene_number: int
    start_char_pos: int
    end_char_pos: int
    start_line: int
    end_line: int
    break_type: SceneBreakType
    chapter_number: Optional[int] = None
    
    @validator('file_id', 'project_id')
    def validate_object_id(cls, v):
        """Validate ObjectId format"""
        if not ObjectId.is_valid(v):
            raise ValueError('Invalid ID format')
        return v


class SceneUpdate(BaseModel):
    """Scene update model"""
    location: Optional[str] = None
    time_marker: Optional[str] = None
    summary: Optional[str] = None
    pov_character: Optional[str] = None
    mood: Optional[str] = None


class SceneResponse(BaseModel):
    """Scene response model"""
    id: str
    file_id: str
    project_id: str
    scene_number: int
    chapter_number: Optional[int]
    start_char_pos: int
    end_char_pos: int
    start_line: int
    end_line: int
    break_type: SceneBreakType
    characters_present: List[str]
    location: Optional[str]
    time_marker: Optional[str]
    word_count: int
    paragraph_count: int
    dialogue_percentage: float
    summary: Optional[str]
    pov_character: Optional[str]
    mood: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

