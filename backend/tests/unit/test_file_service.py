"""
Unit tests for FileService
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch


class TestFileService:
    """Unit tests for file service"""
    
    @pytest.mark.asyncio
    async def test_get_file_metadata(self):
        """Test getting file metadata"""
        from app.services.file_service import FileService
        
        service = FileService()
        service.file_repository = Mock()
        
        file_id = "file123"
        mock_file = Mock()
        mock_file.id = file_id
        mock_file.filename = "test.txt"
        mock_file.size = 1024
        mock_file.content_type = "text/plain"
        
        service.file_repository.get_by_id = AsyncMock(return_value=mock_file)
        
        result = await service.get_file_metadata(file_id)
        
        assert result is not None
        assert "size" in result
        assert "content_type" in result
    
    @pytest.mark.asyncio
    async def test_delete_file(self):
        """Test file deletion"""
        from app.services.file_service import FileService
        
        service = FileService()
        service.file_repository = Mock()
        
        file_id = "file123"
        mock_file = Mock()
        mock_file.id = file_id
        mock_file.gridfs_id = "gridfs123"
        
        service.file_repository.get_by_id = AsyncMock(return_value=mock_file)
        service.file_repository.delete_by_id = AsyncMock(return_value=True)
        
        # Mock get_gridfs to return a mock GridFS object
        mock_gridfs = AsyncMock()
        mock_gridfs.delete = AsyncMock()
        
        with patch('app.services.file_service.get_gridfs', return_value=mock_gridfs):
            result = await service.delete_file(file_id)
            assert result is True
