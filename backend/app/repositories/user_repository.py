from typing import Optional, Dict, Any
from datetime import datetime

from app.core.repository import BaseRepository
from app.models.user import User


class UserRepository(BaseRepository[User]):
    """User repository with CRUD operations"""
    
    def __init__(self):
        super().__init__("users")
    
    def _to_model(self, document: Dict[str, Any]) -> User:
        """Convert MongoDB document to User model"""
        return User.from_dict(document)
    
    def _to_document(self, model: User) -> Dict[str, Any]:
        """Convert User model to MongoDB document"""
        return model.to_dict()
    
    async def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        return await self.get_by_filter({"email": email.lower()})
    
    async def email_exists(self, email: str) -> bool:
        """Check if email already exists"""
        return await self.exists({"email": email.lower()})
    
    async def update_last_login(self, user_id: str) -> Optional[User]:
        """Update user's last login timestamp"""
        return await self.update_by_id(user_id, {"last_login": datetime.utcnow()})
    
    async def verify_email(self, user_id: str) -> Optional[User]:
        """Mark user's email as verified"""
        return await self.update_by_id(user_id, {"email_verified": True})
    
    async def update_password(self, user_id: str, password_hash: str) -> Optional[User]:
        """Update user's password hash"""
        return await self.update_by_id(user_id, {"password_hash": password_hash})
    
    async def update_settings(self, user_id: str, settings: Dict[str, Any]) -> Optional[User]:
        """Update user settings"""
        return await self.update_by_id(user_id, {"settings": settings})
    
    async def get_users_by_role(self, role: str, skip: int = 0, limit: int = 100) -> list[User]:
        """Get users by role"""
        return await self.get_many({"role": role}, skip=skip, limit=limit)
    
    async def search_users(self, query: str, skip: int = 0, limit: int = 100) -> list[User]:
        """Search users by email"""
        filter_dict = {
            "email": {"$regex": query, "$options": "i"}
        }
        return await self.get_many(filter_dict, skip=skip, limit=limit)