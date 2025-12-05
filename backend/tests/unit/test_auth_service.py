"""
Unit tests for AuthService
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime


class TestAuthService:
    """Unit tests for authentication service"""
    
    @pytest.mark.asyncio
    async def test_register_user_success(self):
        """Test successful user registration"""
        from app.services.auth_service import AuthService
        from app.models.user import UserCreate
        
        service = AuthService()
        service.user_repository = Mock()
        
        # Mock no existing user
        service.user_repository.get_by_email = AsyncMock(return_value=None)
        
        # Mock user creation
        mock_user = Mock()
        mock_user.id = "user123"
        mock_user.email = "test@example.com"
        service.user_repository.create = AsyncMock(return_value=mock_user)
        
        user_data = UserCreate(
            email="test@example.com",
            password="SecurePass123!",
            confirm_password="SecurePass123!"
        )
        
        result = await service.register_user(user_data)
        
        assert result.email == "test@example.com"
        assert result.id == "user123"
    
    def test_create_access_token(self):
        """Test access token creation"""
        from app.services.auth_service import AuthService
        
        service = AuthService()
        user_id = "user123"
        token = service.create_access_token(user_id)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0
    
    def test_create_refresh_token(self):
        """Test refresh token creation"""
        from app.services.auth_service import AuthService
        
        service = AuthService()
        user_id = "user123"
        token = service.create_refresh_token(user_id)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0
