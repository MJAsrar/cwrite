from typing import Optional, Dict, Any, List
from bson import ObjectId
import logging

from app.core.repository import BaseRepository
from app.models.file import ProjectFile, UploadStatus, ProcessingStatus

logger = logging.getLogger(__name__)


class FileRepository(BaseRepository[ProjectFile]):
    """File repository with CRUD operations"""
    
    def __init__(self):
        super().__init__("files")
    
    def _to_model(self, document: Dict[str, Any]) -> ProjectFile:
        """Convert MongoDB document to ProjectFile model"""
        return ProjectFile.from_dict(document)
    
    def _to_document(self, model: ProjectFile) -> Dict[str, Any]:
        """Convert ProjectFile model to MongoDB document"""
        return model.to_dict()
    
    async def get_by_project(self, project_id: str, skip: int = 0, limit: int = 100) -> List[ProjectFile]:
        """Get files by project ID"""
        return await self.get_many(
            {"project_id": ObjectId(project_id)}, 
            skip=skip, 
            limit=limit,
            sort=[("created_at", -1)]
        )
    
    async def get_by_gridfs_id(self, gridfs_id: str) -> Optional[ProjectFile]:
        """Get file by GridFS ID"""
        return await self.get_by_filter({"gridfs_id": ObjectId(gridfs_id)})
    
    async def get_by_filename(self, project_id: str, filename: str) -> Optional[ProjectFile]:
        """Get file by project ID and filename"""
        return await self.get_by_filter({
            "project_id": ObjectId(project_id),
            "filename": filename
        })
    
    async def update_upload_status(self, file_id: str, status: UploadStatus, error_message: Optional[str] = None) -> Optional[ProjectFile]:
        """Update file upload status"""
        update_data = {"upload_status": status}
        if error_message:
            update_data["error_message"] = error_message
        
        return await self.update_by_id(file_id, update_data)
    
    async def update_processing_status(self, file_id: str, status: ProcessingStatus, error_message: Optional[str] = None) -> Optional[ProjectFile]:
        """Update file processing status"""
        update_data = {"processing_status": status}
        if error_message:
            update_data["error_message"] = error_message
        
        return await self.update_by_id(file_id, update_data)
    
    async def update_text_content(self, file_id: str, text_content: str, metadata: Dict[str, Any]) -> Optional[ProjectFile]:
        """Update file text content and metadata"""
        update_data = {
            "text_content": text_content,
            "metadata": metadata
        }
        return await self.update_by_id(file_id, update_data)
    
    async def get_files_by_status(self, upload_status: Optional[UploadStatus] = None, processing_status: Optional[ProcessingStatus] = None, skip: int = 0, limit: int = 100) -> List[ProjectFile]:
        """Get files by status"""
        filter_dict = {}
        if upload_status:
            filter_dict["upload_status"] = upload_status
        if processing_status:
            filter_dict["processing_status"] = processing_status
        
        return await self.get_many(filter_dict, skip=skip, limit=limit)
    
    async def get_pending_processing_files(self, limit: int = 10) -> List[ProjectFile]:
        """Get files pending processing"""
        return await self.get_many(
            {
                "upload_status": UploadStatus.COMPLETED,
                "processing_status": ProcessingStatus.PENDING
            },
            limit=limit,
            sort=[("created_at", 1)]  # Oldest first
        )
    
    async def delete_by_project(self, project_id: str) -> int:
        """Delete all files for a project"""
        return await self.delete_by_filter({"project_id": ObjectId(project_id)})
    
    async def get_project_file_stats(self, project_id: str) -> Dict[str, Any]:
        """Get file statistics for a project"""
        try:
            pipeline = [
                {"$match": {"project_id": ObjectId(project_id)}},
                {"$group": {
                    "_id": None,
                    "total_files": {"$sum": 1},
                    "total_size": {"$sum": "$size"},
                    "total_words": {"$sum": "$metadata.word_count"},
                    "completed_files": {
                        "$sum": {"$cond": [{"$eq": ["$processing_status", "completed"]}, 1, 0]}
                    },
                    "processing_files": {
                        "$sum": {"$cond": [{"$eq": ["$processing_status", "processing"]}, 1, 0]}
                    },
                    "failed_files": {
                        "$sum": {"$cond": [{"$eq": ["$processing_status", "failed"]}, 1, 0]}
                    }
                }}
            ]
            
            result = await self.aggregate(pipeline)
            return result[0] if result else {
                "total_files": 0,
                "total_size": 0,
                "total_words": 0,
                "completed_files": 0,
                "processing_files": 0,
                "failed_files": 0
            }
            
        except Exception as e:
            logger.error(f"Error getting file stats for project {project_id}: {e}")
            return {
                "total_files": 0,
                "total_size": 0,
                "total_words": 0,
                "completed_files": 0,
                "processing_files": 0,
                "failed_files": 0
            }