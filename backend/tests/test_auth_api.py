"""
Integration tests for Authentication API endpoints
"""
import pytest
from httpx import AsyncClient


class TestAuthenticationAPI:
    """Test suite for authentication endpoints"""
    
    @pytest.mark.asyncio
    async def test_register_new_user(self, api_client: AsyncClient):
        """Test user registration with valid data"""
        import time
        unique_email = f"newuser_{int(time.time())}@example.com"
        
        register_data = {
            "email": unique_email,
            "password": "SecurePass123!",
            "confirm_password": "SecurePass123!"
        }
        
        response = await api_client.post("/api/v1/auth/register", json=register_data)
        
        assert response.status_code == 201
        data = response.json()
        
        # Verify response structure
        assert "user" in data
        assert "tokens" in data
        assert data["user"]["email"] == unique_email
        assert "access_token" in data["tokens"]
        assert "refresh_token" in data["tokens"]
        assert data["tokens"]["token_type"] == "bearer"
    
    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, api_client: AsyncClient, auth_tokens):
        """Test registration with existing email returns error"""
        TEST_USER_EMAIL = "test_user@example.com"
        TEST_USER_PASSWORD = "TestPassword123!"
        
        register_data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "confirm_password": TEST_USER_PASSWORD
        }
        
        response = await api_client.post("/api/v1/auth/register", json=register_data)
        
        assert response.status_code in [400, 409]  # Bad Request or Conflict
    
    @pytest.mark.asyncio
    async def test_register_invalid_password(self, api_client: AsyncClient):
        """Test registration with weak password"""
        import time
        unique_email = f"weakpass_{int(time.time())}@example.com"
        
        register_data = {
            "email": unique_email,
            "password": "weak",  # Too short
            "confirm_password": "weak"
        }
        
        response = await api_client.post("/api/v1/auth/register", json=register_data)
        
        assert response.status_code == 422  # Validation error
    
    @pytest.mark.asyncio
    async def test_register_password_mismatch(self, api_client: AsyncClient):
        """Test registration with mismatched passwords"""
        import time
        unique_email = f"mismatch_{int(time.time())}@example.com"
        
        register_data = {
            "email": unique_email,
            "password": "SecurePass123!",
            "confirm_password": "DifferentPass123!"
        }
        
        response = await api_client.post("/api/v1/auth/register", json=register_data)
        
        assert response.status_code in [400, 422]
    
    @pytest.mark.asyncio
    async def test_login_valid_credentials(self, api_client: AsyncClient):
        """Test login with valid credentials"""
        TEST_USER_EMAIL = "test_user@example.com"
        TEST_USER_PASSWORD = "TestPassword123!"
        
        login_data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        
        response = await api_client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "user" in data
        assert "tokens" in data
        assert data["user"]["email"] == TEST_USER_EMAIL
        assert "access_token" in data["tokens"]
    
    @pytest.mark.asyncio
    async def test_login_invalid_credentials(self, api_client: AsyncClient):
        """Test login with invalid password"""
        TEST_USER_EMAIL = "test_user@example.com"
        
        login_data = {
            "email": TEST_USER_EMAIL,
            "password": "WrongPassword123!"
        }
        
        response = await api_client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, api_client: AsyncClient):
        """Test login with non-existent email"""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "SomePassword123!"
        }
        
        response = await api_client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_get_current_user(self, api_client: AsyncClient, auth_headers):
        """Test retrieving current user information"""
        response = await api_client.get("/api/v1/auth/me", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert "email" in data
        assert "role" in data
        assert "email_verified" in data
    
    @pytest.mark.asyncio
    async def test_get_current_user_unauthorized(self, api_client: AsyncClient):
        """Test accessing user info without authentication"""
        response = await api_client.get("/api/v1/auth/me")
        
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_get_current_user_invalid_token(self, api_client: AsyncClient):
        """Test accessing user info with invalid token"""
        headers = {"Authorization": "Bearer invalid_token_here"}
        response = await api_client.get("/api/v1/auth/me", headers=headers)
        
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_logout(self, api_client: AsyncClient, auth_headers):
        """Test user logout"""
        response = await api_client.post("/api/v1/auth/logout", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert "logged out" in data["message"].lower()
    
    @pytest.mark.asyncio
    async def test_refresh_token(self, api_client: AsyncClient, auth_tokens):
        """Test refreshing access token"""
        # Set refresh token as cookie
        cookies = {"refresh_token": auth_tokens["refresh_token"]}
        
        response = await api_client.post("/api/v1/auth/refresh", cookies=cookies)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
