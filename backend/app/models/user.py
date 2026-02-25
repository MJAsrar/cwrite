from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
import bcrypt
import re


class UserSettings(BaseModel):
    """User settings model"""
    theme: str = "light"  # "light" | "dark"
    notifications: bool = True
    language: str = "en"
    timezone: str = "UTC"
    
    class Config:
        extra = "allow"


class User(BaseModel):
    """User model with validation and password hashing"""
    id: Optional[str] = Field(None, alias="_id")
    email: EmailStr
    password_hash: Optional[str] = None
    role: str = "user"  # "user" | "admin"
    email_verified: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    settings: UserSettings = Field(default_factory=UserSettings)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }
    
    @validator('email')
    def validate_email(cls, v):
        """Validate email format"""
        if not v or len(v.strip()) == 0:
            raise ValueError('Email cannot be empty')
        return v.lower().strip()
    
    @validator('role')
    def validate_role(cls, v):
        """Validate user role"""
        allowed_roles = ['user', 'admin']
        if v not in allowed_roles:
            raise ValueError(f'Role must be one of: {allowed_roles}')
        return v
    
    def set_password(self, password: str) -> None:
        """Hash and set password"""
        if not password or len(password) < 8:
            raise ValueError("Password must be at least 8 characters long")
        
        # Validate password strength
        if not re.search(r'[A-Za-z]', password):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r'\d', password):
            raise ValueError("Password must contain at least one number")
        
        # Hash password
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def verify_password(self, password: str) -> bool:
        """Verify password against hash"""
        if not self.password_hash or not password:
            return False
        
        return bcrypt.checkpw(
            password.encode('utf-8'), 
            self.password_hash.encode('utf-8')
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for MongoDB storage"""
        data = self.dict(by_alias=True, exclude_none=True)
        
        # Convert string ID to ObjectId for MongoDB
        if data.get('_id'):
            data['_id'] = ObjectId(data['_id'])
        
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'User':
        """Create User instance from MongoDB document"""
        if data.get('_id'):
            data['_id'] = str(data['_id'])
        
        return cls(**data)
    
    def to_response(self) -> Dict[str, Any]:
        """Convert to safe response format (no password hash)"""
        return {
            "id": self.id,
            "email": self.email,
            "role": self.role,
            "email_verified": self.email_verified,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "last_login": self.last_login,
            "settings": self.settings.dict()
        }


class UserCreate(BaseModel):
    """User creation model"""
    email: EmailStr
    password: str
    confirm_password: str
    
    @validator('email')
    def validate_email(cls, v):
        """Validate email format"""
        return v.lower().strip()
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        """Validate password confirmation"""
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v
    
    @validator('password')
    def validate_password(cls, v):
        """Validate password strength"""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r'[A-Za-z]', v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r'\d', v):
            raise ValueError("Password must contain at least one number")
        return v


class UserLogin(BaseModel):
    """User login model"""
    email: EmailStr
    password: str
    
    @validator('email')
    def validate_email(cls, v):
        """Validate email format"""
        return v.lower().strip()


class UserUpdate(BaseModel):
    """User update model"""
    email: Optional[EmailStr] = None
    settings: Optional[UserSettings] = None
    
    @validator('email')
    def validate_email(cls, v):
        """Validate email format"""
        if v:
            return v.lower().strip()
        return v


class PasswordReset(BaseModel):
    """Password reset model"""
    email: EmailStr
    
    @validator('email')
    def validate_email(cls, v):
        """Validate email format"""
        return v.lower().strip()


class PasswordResetConfirm(BaseModel):
    """Password reset confirmation model"""
    token: str
    new_password: str
    confirm_password: str
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        """Validate password confirmation"""
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v
    
    @validator('new_password')
    def validate_password(cls, v):
        """Validate password strength"""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r'[A-Za-z]', v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r'\d', v):
            raise ValueError("Password must contain at least one number")
        return v