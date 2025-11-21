import os
import hashlib
import mimetypes
from typing import Optional, Dict, Any, List, BinaryIO
from fastapi import UploadFile, HTTPException
from bson import ObjectId
import logging
import asyncio
from datetime import datetime
import re
from pathlib import Path

# Optional import for MIME type detection
try:
    import magic
    MAGIC_AVAILABLE = True
except ImportError:
    MAGIC_AVAILABLE = False
    magic = None

from app.core.database import get_gridfs, get_database
from app.core.config import settings
from app.models.file import ProjectFile, FileUpload, UploadStatus, ProcessingStatus, FileMetadata
from app.repositories.file_repository import FileRepository

logger = logging.getLogger(__name__)


class FileValidationError(Exception):
    """Custom exception for file validation errors"""
    pass


class FileService:
    """File service for handling uploads, validation, and GridFS operations"""
    
    def __init__(self):
        self.file_repository = FileRepository()
        self.max_file_size = settings.MAX_FILE_SIZE_MB * 1024 * 1024  # Convert to bytes
        self.allowed_extensions = settings.ALLOWED_FILE_TYPES
        self.allowed_mime_types = {
            '.txt': ['text/plain'],
            '.md': ['text/markdown', 'text/plain'],
            '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        }
        
        # Security patterns to detect potentially malicious content
        self.security_patterns = [
            r'<script[^>]*>.*?</script>',  # Script tags
            r'javascript:',  # JavaScript URLs
            r'vbscript:',   # VBScript URLs
            r'data:text/html',  # Data URLs with HTML
            r'<?php',       # PHP tags
            r'<%.*?%>',     # ASP tags
            r'{{.*?}}',     # Template injection patterns
        ]
    
    async def validate_file(self, file: UploadFile) -> FileUpload:
        """
        Comprehensive file validation including format, size, and security checks
        
        Args:
            file: FastAPI UploadFile object
            
        Returns:
            FileUpload: Validated file metadata
            
        Raises:
            FileValidationError: If validation fails
        """
        try:
            # Basic validation
            if not file.filename:
                raise FileValidationError("Filename is required")
            
            # Sanitize filename
            sanitized_filename = self._sanitize_filename(file.filename)
            
            # Validate file extension
            file_extension = self._get_file_extension(sanitized_filename)
            if file_extension not in self.allowed_extensions:
                raise FileValidationError(
                    f"File type '{file_extension}' not supported. "
                    f"Allowed types: {', '.join(self.allowed_extensions)}"
                )
            
            # Validate file size
            file_size = await self._get_file_size(file)
            if file_size > self.max_file_size:
                raise FileValidationError(
                    f"File size ({file_size} bytes) exceeds maximum allowed size "
                    f"({self.max_file_size} bytes)"
                )
            
            if file_size == 0:
                raise FileValidationError("File is empty")
            
            # Validate MIME type
            content_type = await self._validate_mime_type(file, file_extension)
            
            # Security validation
            await self._security_scan(file)
            
            return FileUpload(
                filename=sanitized_filename,
                content_type=content_type,
                size=file_size
            )
            
        except FileValidationError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error during file validation: {e}")
            raise FileValidationError(f"File validation failed: {str(e)}")
    
    async def upload_file(self, project_id: str, file: UploadFile) -> ProjectFile:
        """
        Upload file to GridFS with validation and security checks
        
        Args:
            project_id: Project ID to associate the file with
            file: FastAPI UploadFile object
            
        Returns:
            ProjectFile: Created file record
            
        Raises:
            HTTPException: If upload fails
        """
        try:
            # Validate project ID
            if not ObjectId.is_valid(project_id):
                raise HTTPException(status_code=400, detail="Invalid project ID")
            
            # Validate file
            file_upload = await self.validate_file(file)
            
            # Check for duplicate filename in project
            existing_file = await self.file_repository.get_by_filename(
                project_id, file_upload.filename
            )
            if existing_file:
                raise HTTPException(
                    status_code=409, 
                    detail=f"File '{file_upload.filename}' already exists in project"
                )
            
            # Create file record
            project_file = ProjectFile(
                project_id=project_id,
                filename=file_upload.filename,
                original_filename=file.filename or file_upload.filename,
                content_type=file_upload.content_type,
                size=file_upload.size,
                upload_status=UploadStatus.UPLOADING,
                processing_status=ProcessingStatus.PENDING,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            # Save file record to database
            created_file = await self.file_repository.create(project_file)
            if not created_file:
                raise HTTPException(status_code=500, detail="Failed to create file record")
            
            try:
                # Upload to GridFS
                gridfs = get_gridfs()
                if not gridfs:
                    raise HTTPException(status_code=500, detail="GridFS not available")
                
                # Reset file position
                await file.seek(0)
                
                # Read file content for text extraction
                file_content = await file.read()
                await file.seek(0)
                
                # Extract text content for text-based files
                text_content = None
                if file_upload.content_type.startswith('text/') or file_upload.filename.endswith(('.txt', '.md', '.markdown')):
                    try:
                        text_content = file_content.decode('utf-8')
                    except Exception as e:
                        logger.warning(f"Failed to decode text content: {e}")
                
                # Upload file with metadata
                gridfs_id = await gridfs.upload_from_stream(
                    filename=file_upload.filename,
                    source=file.file,
                    metadata={
                        "project_id": project_id,
                        "file_id": created_file.id,
                        "content_type": file_upload.content_type,
                        "original_filename": file.filename,
                        "upload_timestamp": datetime.utcnow()
                    }
                )
                
                # Update file record with GridFS ID and text content
                update_data = {
                    "gridfs_id": str(gridfs_id),
                    "upload_status": UploadStatus.COMPLETED,
                    "updated_at": datetime.utcnow()
                }
                if text_content:
                    update_data["text_content"] = text_content
                
                updated_file = await self.file_repository.update_by_id(
                    created_file.id,
                    update_data
                )
                
                if not updated_file:
                    # Cleanup GridFS file if database update fails
                    await gridfs.delete(gridfs_id)
                    raise HTTPException(status_code=500, detail="Failed to update file record")
                
                logger.info(f"Successfully uploaded file {file_upload.filename} to project {project_id}")
                return updated_file
                
            except Exception as e:
                # Update file status to failed
                await self.file_repository.update_upload_status(
                    created_file.id, 
                    UploadStatus.FAILED, 
                    str(e)
                )
                raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Unexpected error during file upload: {e}")
            raise HTTPException(status_code=500, detail="Internal server error")
    
    async def get_file_content(self, file_id: str) -> Optional[bytes]:
        """
        Retrieve file content from GridFS
        
        Args:
            file_id: File ID
            
        Returns:
            bytes: File content or None if not found
        """
        try:
            # Get file record
            file_record = await self.file_repository.get_by_id(file_id)
            if not file_record or not file_record.gridfs_id:
                return None
            
            # Get content from GridFS
            gridfs = get_gridfs()
            if not gridfs:
                return None
            
            grid_out = await gridfs.open_download_stream(ObjectId(file_record.gridfs_id))
            content = await grid_out.read()
            
            return content
            
        except Exception as e:
            logger.error(f"Error retrieving file content for {file_id}: {e}")
            return None
    
    async def delete_file(self, file_id: str) -> bool:
        """
        Delete file from both database and GridFS
        
        Args:
            file_id: File ID to delete
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Get file record
            file_record = await self.file_repository.get_by_id(file_id)
            if not file_record:
                return False
            
            # Delete from GridFS if exists
            if file_record.gridfs_id:
                gridfs = get_gridfs()
                if gridfs:
                    try:
                        await gridfs.delete(ObjectId(file_record.gridfs_id))
                    except Exception as e:
                        logger.warning(f"Failed to delete GridFS file {file_record.gridfs_id}: {e}")
            
            # Delete from database
            success = await self.file_repository.delete_by_id(file_id)
            
            if success:
                logger.info(f"Successfully deleted file {file_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error deleting file {file_id}: {e}")
            return False
    
    def _sanitize_filename(self, filename: str) -> str:
        """
        Sanitize filename to prevent security issues
        
        Args:
            filename: Original filename
            
        Returns:
            str: Sanitized filename
        """
        # Remove path separators and dangerous characters
        filename = os.path.basename(filename)
        filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
        
        # Remove control characters
        filename = ''.join(char for char in filename if ord(char) >= 32)
        
        # Limit length
        if len(filename) > 255:
            name, ext = os.path.splitext(filename)
            filename = name[:255-len(ext)] + ext
        
        # Ensure filename is not empty
        if not filename.strip():
            filename = f"unnamed_file_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        
        return filename.strip()
    
    def _get_file_extension(self, filename: str) -> str:
        """Get file extension in lowercase"""
        return os.path.splitext(filename)[1].lower()
    
    async def _get_file_size(self, file: UploadFile) -> int:
        """Get file size by seeking to end"""
        # Access the underlying file object for seek with whence parameter
        file.file.seek(0, 2)  # Seek to end (whence=2)
        size = file.file.tell()
        await file.seek(0)  # Reset position
        return size
    
    async def _validate_mime_type(self, file: UploadFile, file_extension: str) -> str:
        """
        Validate MIME type using both file extension and magic number detection
        
        Args:
            file: UploadFile object
            file_extension: File extension
            
        Returns:
            str: Validated content type
            
        Raises:
            FileValidationError: If MIME type is invalid
        """
        try:
            # Get allowed MIME types for this extension
            allowed_types = self.allowed_mime_types.get(file_extension, [])
            
            # Check declared content type
            declared_type = file.content_type
            if declared_type in allowed_types:
                # Additional validation with magic numbers
                await file.seek(0)
                file_header = await file.read(1024)  # Read first 1KB
                await file.seek(0)
                
                # Use python-magic for MIME type detection if available
                if MAGIC_AVAILABLE:
                    try:
                        detected_type = magic.from_buffer(file_header, mime=True)
                        if detected_type in allowed_types:
                            return detected_type
                    except Exception as e:
                        logger.warning(f"Magic MIME detection failed: {e}")
                else:
                    logger.debug("python-magic not available, skipping MIME detection")
                
                # Fall back to declared type if magic detection fails
                return declared_type
            
            # If declared type is not allowed, try to detect
            await file.seek(0)
            file_header = await file.read(1024)
            await file.seek(0)
            
            if MAGIC_AVAILABLE:
                try:
                    detected_type = magic.from_buffer(file_header, mime=True)
                    if detected_type in allowed_types:
                        return detected_type
                except Exception as e:
                    logger.warning(f"Magic MIME detection failed: {e}")
            else:
                logger.debug("python-magic not available, using fallback MIME detection")
            
            # Use mimetypes as fallback
            guessed_type, _ = mimetypes.guess_type(file.filename or "")
            if guessed_type in allowed_types:
                return guessed_type
            
            raise FileValidationError(
                f"Invalid file type. Expected one of {allowed_types}, "
                f"but got '{declared_type}'"
            )
            
        except FileValidationError:
            raise
        except Exception as e:
            logger.error(f"MIME type validation error: {e}")
            raise FileValidationError("Could not validate file type")
    
    async def _security_scan(self, file: UploadFile) -> None:
        """
        Perform security scan on file content
        
        Args:
            file: UploadFile object
            
        Raises:
            FileValidationError: If security issues are found
        """
        try:
            # Read file content for scanning
            await file.seek(0)
            content = await file.read()
            await file.seek(0)
            
            # Convert to string for text files
            try:
                text_content = content.decode('utf-8', errors='ignore')
            except Exception:
                # For binary files, convert to string representation
                text_content = str(content)
            
            # Check for malicious patterns
            for pattern in self.security_patterns:
                if re.search(pattern, text_content, re.IGNORECASE | re.DOTALL):
                    raise FileValidationError(
                        "File contains potentially malicious content"
                    )
            
            # Check for executable file signatures
            if content.startswith(b'MZ') or content.startswith(b'\x7fELF'):
                raise FileValidationError("Executable files are not allowed")
            
            # Check for suspicious file size patterns
            if len(content) > self.max_file_size:
                raise FileValidationError("File size exceeds maximum limit")
            
        except FileValidationError:
            raise
        except Exception as e:
            logger.error(f"Security scan error: {e}")
            # Don't fail upload for security scan errors, just log them
            logger.warning("Security scan failed, proceeding with upload")
    
    async def get_file_metadata(self, file_id: str) -> Optional[Dict[str, Any]]:
        """
        Get file metadata including GridFS information
        
        Args:
            file_id: File ID
            
        Returns:
            Dict containing file metadata or None if not found
        """
        try:
            file_record = await self.file_repository.get_by_id(file_id)
            if not file_record:
                return None
            
            metadata = {
                "id": file_record.id,
                "filename": file_record.filename,
                "original_filename": file_record.original_filename,
                "content_type": file_record.content_type,
                "size": file_record.size,
                "upload_status": file_record.upload_status,
                "processing_status": file_record.processing_status,
                "created_at": file_record.created_at,
                "updated_at": file_record.updated_at,
                "metadata": file_record.metadata.dict() if file_record.metadata else {}
            }
            
            # Add GridFS metadata if available
            if file_record.gridfs_id:
                gridfs = get_gridfs()
                if gridfs:
                    try:
                        grid_out = await gridfs.find({"_id": ObjectId(file_record.gridfs_id)}).to_list(1)
                        if grid_out:
                            gridfs_info = grid_out[0]
                            metadata["gridfs_metadata"] = {
                                "upload_date": gridfs_info.upload_date,
                                "length": gridfs_info.length,
                                "chunk_size": gridfs_info.chunk_size,
                                "md5": gridfs_info.md5
                            }
                    except Exception as e:
                        logger.warning(f"Failed to get GridFS metadata: {e}")
            
            return metadata
            
        except Exception as e:
            logger.error(f"Error getting file metadata for {file_id}: {e}")
            return None