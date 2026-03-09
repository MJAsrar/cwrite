"""
Conversation and Message Models

Stores chat conversations and messages for the AI assistant
"""

from pydantic import BaseModel, Field, validator, root_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId
from enum import Enum


class MessageRole(str, Enum):
    """Message role enumeration"""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class Message(BaseModel):
    """Single message in a conversation"""
    id: Optional[str] = Field(None, alias="_id")
    conversation_id: str
    role: MessageRole
    content: str
    
    # Context used to generate this message (for assistant messages)
    context_used: Optional[Dict[str, Any]] = None
    
    # Metadata
    tokens: Optional[int] = None  # Estimated token count
    model: Optional[str] = None  # Model used (for assistant messages)
    
    created_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }
    
    @validator('conversation_id', pre=True)
    def validate_conversation_id(cls, v):
        """Validate conversation ID format and convert ObjectId to string"""
        if isinstance(v, ObjectId):
            return str(v)
        if not ObjectId.is_valid(v):
            raise ValueError('Invalid conversation ID format')
        return v
    
    @validator('id', pre=True)
    def validate_id(cls, v):
        """Convert ObjectId to string"""
        if isinstance(v, ObjectId):
            return str(v)
        return v


class Conversation(BaseModel):
    """Conversation thread"""
    id: Optional[str] = Field(None, alias="_id")
    project_id: str
    file_id: Optional[str] = None  # Optional: conversation about specific file
    user_id: str
    
    # Conversation metadata
    title: Optional[str] = None  # Auto-generated or user-set
    summary: Optional[str] = None  # Brief summary of conversation
    
    # Settings
    model: str = "llama-3.3-70b-versatile"
    temperature: float = 0.7
    
    # Message IDs (for quick lookup)
    message_count: int = 0
    
    # Timestamps
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_message_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }
    
    @validator('id', pre=True)
    def validate_id(cls, v):
        """Convert ObjectId to string"""
        if isinstance(v, ObjectId):
            return str(v)
        return v
    
    @validator('project_id', 'user_id', pre=True)
    def validate_object_id(cls, v):
        """Validate ObjectId format and convert ObjectId to string"""
        if isinstance(v, ObjectId):
            return str(v)
        if not ObjectId.is_valid(v):
            raise ValueError('Invalid ID format')
        return v
    
    @validator('file_id', pre=True)
    def validate_file_id(cls, v):
        """Validate file ID format and convert ObjectId to string"""
        if v is None:
            return v
        if isinstance(v, ObjectId):
            return str(v)
        if not ObjectId.is_valid(v):
            raise ValueError('Invalid file ID format')
        return v
    
    @validator('temperature')
    def validate_temperature(cls, v):
        """Validate temperature"""
        if not 0.0 <= v <= 2.0:
            raise ValueError('Temperature must be between 0.0 and 2.0')
        return v


class ConversationCreate(BaseModel):
    """Schema for creating a new conversation"""
    project_id: str
    file_id: Optional[str] = None
    title: Optional[str] = None
    model: str = "llama-3.3-70b-versatile"
    temperature: float = 0.7


class ConversationResponse(BaseModel):
    """Schema for conversation response"""
    id: str
    project_id: str
    file_id: Optional[str] = None
    user_id: str
    title: Optional[str] = None
    summary: Optional[str] = None
    model: str
    temperature: float
    message_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_message_at: Optional[datetime] = None


class MessageCreate(BaseModel):
    """Schema for creating a new message"""
    conversation_id: str
    content: str


class MessageResponse(BaseModel):
    """Schema for message response"""
    id: str
    conversation_id: str
    role: str
    content: str
    context_used: Optional[Dict[str, Any]] = None
    tokens: Optional[int] = None
    model: Optional[str] = None
    created_at: datetime


class ChatRequest(BaseModel):
    """Schema for chat request"""
    message: str
    conversation_id: Optional[str] = None  # If None, creates new conversation
    project_id: str
    file_id: Optional[str] = None
    include_entities: bool = True
    include_scenes: bool = True
    include_relationships: bool = True
    max_context_chunks: int = 5
    context: Optional[Dict[str, Any]] = None  # Editor context (file, lines, selected text)
    allow_edits: bool = True  # Whether AI can propose edits


class ChatResponse(BaseModel):
    """Schema for chat response"""
    conversation_id: str
    message: MessageResponse
    context_summary: Optional[Dict[str, Any]] = None
    edit_proposals: List[Dict[str, Any]] = []  # AI-proposed edits
    has_edits: bool = False


class SourceItem(BaseModel):
    """A single web search source"""
    title: str
    url: str
    snippet: str


class ResearchRequest(BaseModel):
    """Schema for research chat request"""
    message: str
    project_id: str
    conversation_id: Optional[str] = None
    max_sources: int = 5


class ResearchResponse(BaseModel):
    """Schema for research chat response"""
    conversation_id: str
    message: MessageResponse
    sources: List[SourceItem] = []
    search_query: str

