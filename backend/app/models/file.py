from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from bson import ObjectId
from enum import Enum


class UploadStatus(str, Enum):
    """File upload status enumeration"""
    PENDING = "pending"
    UPLOADING = "uploading"
    COMPLETED = "completed"
    FAILED = "failed"


class ProcessingStatus(str, Enum):
    """File processing status enumeration"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class FileMetadata(BaseModel):
    """File metadata model"""
    word_count: int = 0
    character_count: int = 0
    line_count: int = 0
    chapter_count: int = 0
    language: str = "en"
    encoding: str = "utf-8"
    
    class Config:
        extra = "allow"


class ProjectFile(BaseModel):
    """File model with GridFS integration"""
    id: Optional[str] = Field(None, alias="_id")
    project_id: str
    filename: str
    original_filename: str
    content_type: str
    size: int
    gridfs_id: Optional[str] = None
    text_content: Optional[str] = None
    upload_status: UploadStatus = UploadStatus.PENDING
    processing_status: ProcessingStatus = ProcessingStatus.PENDING
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    metadata: FileMetadata = Field(default_factory=FileMetadata)
    error_message: Optional[str] = None
    
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
    
    @validator('filename')
    def validate_filename(cls, v):
        """Validate filename"""
        if not v or len(v.strip()) == 0:
            raise ValueError('Filename cannot be empty')
        if len(v) > 255:
            raise ValueError('Filename cannot exceed 255 characters')
        return v.strip()
    
    @validator('content_type')
    def validate_content_type(cls, v):
        """Validate content type"""
        allowed_types = [
            'text/plain',
            'text/markdown',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
        if v not in allowed_types:
            raise ValueError(f'Content type must be one of: {allowed_types}')
        return v
    
    @validator('size')
    def validate_size(cls, v):
        """Validate file size"""
        if v < 0:
            raise ValueError('File size cannot be negative')
        max_size = 50 * 1024 * 1024  # 50MB
        if v > max_size:
            raise ValueError(f'File size cannot exceed {max_size} bytes')
        return v
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for MongoDB storage"""
        data = self.dict(by_alias=True, exclude_none=True)
        
        # Convert string IDs to ObjectId for MongoDB
        if data.get('_id'):
            data['_id'] = ObjectId(data['_id'])
        if data.get('project_id'):
            data['project_id'] = ObjectId(data['project_id'])
        if data.get('gridfs_id'):
            data['gridfs_id'] = ObjectId(data['gridfs_id'])
        
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ProjectFile':
        """Create ProjectFile instance from MongoDB document"""
        if data.get('_id'):
            data['_id'] = str(data['_id'])
        if data.get('project_id'):
            data['project_id'] = str(data['project_id'])
        if data.get('gridfs_id'):
            data['gridfs_id'] = str(data['gridfs_id'])
        
        return cls(**data)
    
    def set_upload_status(self, status: UploadStatus, error_message: Optional[str] = None) -> None:
        """Set upload status"""
        self.upload_status = status
        if error_message:
            self.error_message = error_message
    
    def set_processing_status(self, status: ProcessingStatus, error_message: Optional[str] = None) -> None:
        """Set processing status"""
        self.processing_status = status
        if error_message:
            self.error_message = error_message
    
    def update_metadata(self, **kwargs) -> None:
        """Update file metadata"""
        for key, value in kwargs.items():
            if hasattr(self.metadata, key):
                setattr(self.metadata, key, value)
    
    def get_file_extension(self) -> str:
        """Get file extension"""
        return self.filename.split('.')[-1].lower() if '.' in self.filename else ''
    
    def is_text_file(self) -> bool:
        """Check if file is a text file"""
        return self.content_type in ['text/plain', 'text/markdown']
    
    def is_word_document(self) -> bool:
        """Check if file is a Word document"""
        return self.content_type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'


class FileUpload(BaseModel):
    """File upload model"""
    filename: str
    content_type: str
    size: int
    
    @validator('filename')
    def validate_filename(cls, v):
        """Validate filename"""
        if not v or len(v.strip()) == 0:
            raise ValueError('Filename cannot be empty')
        
        # Check file extension
        allowed_extensions = ['.txt', '.md', '.docx']
        extension = '.' + v.split('.')[-1].lower() if '.' in v else ''
        if extension not in allowed_extensions:
            raise ValueError(f'File extension must be one of: {allowed_extensions}')
        
        return v.strip()


class FileResponse(BaseModel):
    """File response model"""
    id: str
    project_id: str
    filename: str
    original_filename: str
    content_type: str
    size: int
    upload_status: UploadStatus
    processing_status: ProcessingStatus
    created_at: datetime
    updated_at: datetime
    metadata: FileMetadata
    error_message: Optional[str] = None
    text_content: Optional[str] = None  # Add text content to response
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class FileContent(BaseModel):
    """File content model"""
    file_id: str
    content: str
    metadata: FileMetadata
    
    @validator('file_id')
    def validate_file_id(cls, v):
        """Validate file ID format"""
        if not ObjectId.is_valid(v):
            raise ValueError('Invalid file ID format')
        return v