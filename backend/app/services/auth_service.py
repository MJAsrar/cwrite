from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
import secrets
import hashlib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib
import asyncio
from fastapi import HTTPException, status

from ..core.config import settings
from ..core.redis import get_redis
from ..models.user import User, UserCreate, UserLogin
from ..repositories.user_repository import UserRepository


class AuthService:
    """Authentication service for JWT-based authentication"""
    
    def __init__(self):
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self.user_repository = UserRepository()
        
    async def register_user(self, user_data: UserCreate) -> User:
        """Register a new user"""
        # Check if user already exists
        existing_user = await self.user_repository.get_by_email(user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create new user
        user = User(
            email=user_data.email,
            role="user",
            email_verified=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Set password
        user.set_password(user_data.password)
        
        # Save user
        created_user = await self.user_repository.create(user)
        
        # Send verification email (async)
        asyncio.create_task(self._send_verification_email(created_user))
        
        return created_user
    
    async def authenticate_user(self, credentials: UserLogin) -> Optional[User]:
        """Authenticate user with email and password"""
        user = await self.user_repository.get_by_email(credentials.email)
        if not user:
            return None
        
        if not user.verify_password(credentials.password):
            return None
        
        # Update last login
        user.last_login = datetime.utcnow()
        await self.user_repository.update_by_id(user.id, {"last_login": user.last_login})
        
        return user
    
    def create_access_token(self, user_id: str, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode = {
            "sub": user_id,
            "exp": expire,
            "type": "access"
        }
        
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt
    
    def create_refresh_token(self, user_id: str) -> str:
        """Create JWT refresh token"""
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        
        to_encode = {
            "sub": user_id,
            "exp": expire,
            "type": "refresh"
        }
        
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt
    
    async def verify_token(self, token: str, token_type: str = "access") -> Optional[str]:
        """Verify JWT token and return user ID"""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id: str = payload.get("sub")
            token_type_claim: str = payload.get("type")
            
            if user_id is None or token_type_claim != token_type:
                return None
            
            # Check if token is blacklisted
            if await self._is_token_blacklisted(token):
                return None
            
            return user_id
        except JWTError:
            return None
    
    async def refresh_access_token(self, refresh_token: str) -> Optional[Dict[str, str]]:
        """Refresh access token using refresh token"""
        user_id = await self.verify_token(refresh_token, "refresh")
        if not user_id:
            return None
        
        # Verify user still exists
        user = await self.user_repository.get_by_id(user_id)
        if not user:
            return None
        
        # Create new tokens
        new_access_token = self.create_access_token(user_id)
        new_refresh_token = self.create_refresh_token(user_id)
        
        # Blacklist old refresh token
        await self._blacklist_token(refresh_token)
        
        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }
    
    async def logout_user(self, access_token: str, refresh_token: Optional[str] = None) -> bool:
        """Logout user by blacklisting tokens"""
        try:
            # Blacklist access token
            await self._blacklist_token(access_token)
            
            # Blacklist refresh token if provided
            if refresh_token:
                await self._blacklist_token(refresh_token)
            
            return True
        except Exception:
            return False
    
    async def create_password_reset_token(self, email: str) -> Optional[str]:
        """Create password reset token"""
        user = await self.user_repository.get_by_email(email)
        if not user:
            return None
        
        # Create reset token
        reset_token = secrets.token_urlsafe(32)
        
        # Store token in Redis with expiration (1 hour)
        redis_client = get_redis()
        if redis_client:
            await redis_client.setex(
                f"password_reset:{reset_token}",
                3600,  # 1 hour
                user.id
            )
        
        # Send reset email (async)
        asyncio.create_task(self._send_password_reset_email(user, reset_token))
        
        return reset_token
    
    async def verify_password_reset_token(self, token: str) -> Optional[str]:
        """Verify password reset token and return user ID"""
        redis_client = get_redis()
        if not redis_client:
            return None
            
        user_id = await redis_client.get(f"password_reset:{token}")
        
        if user_id:
            return user_id if isinstance(user_id, str) else user_id.decode('utf-8')
        return None
    
    async def reset_password(self, token: str, new_password: str) -> bool:
        """Reset user password using reset token"""
        user_id = await self.verify_password_reset_token(token)
        if not user_id:
            return False
        
        user = await self.user_repository.get_by_id(user_id)
        if not user:
            return False
        
        # Update password
        user.set_password(new_password)
        user.updated_at = datetime.utcnow()
        
        await self.user_repository.update_by_id(user_id, {
            "password_hash": user.password_hash,
            "updated_at": user.updated_at
        })
        
        # Delete reset token
        redis_client = get_redis()
        if redis_client:
            await redis_client.delete(f"password_reset:{token}")
        
        return True
    
    async def verify_email(self, token: str) -> bool:
        """Verify user email using verification token"""
        redis_client = get_redis()
        if not redis_client:
            return False
            
        user_id = await redis_client.get(f"email_verification:{token}")
        
        if not user_id:
            return False
        
        user_id = user_id if isinstance(user_id, str) else user_id.decode('utf-8')
        user = await self.user_repository.get_by_id(user_id)
        if not user:
            return False
        
        # Update email verification status
        await self.user_repository.update_by_id(user_id, {
            "email_verified": True,
            "updated_at": datetime.utcnow()
        })
        
        # Delete verification token
        if redis_client:
            await redis_client.delete(f"email_verification:{token}")
        
        return True
    
    async def _blacklist_token(self, token: str) -> None:
        """Add token to blacklist"""
        try:
            # Decode token to get expiration
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            exp = payload.get("exp")
            
            if exp:
                # Calculate TTL (time until expiration)
                exp_datetime = datetime.fromtimestamp(exp)
                ttl = int((exp_datetime - datetime.utcnow()).total_seconds())
                
                if ttl > 0:
                    # Store token hash in Redis with TTL
                    token_hash = hashlib.sha256(token.encode()).hexdigest()
                    redis_client = get_redis()
                    if redis_client:
                        await redis_client.setex(f"blacklist:{token_hash}", ttl, "1")
        except Exception:
            # If we can't decode the token, just ignore
            pass
    
    async def _is_token_blacklisted(self, token: str) -> bool:
        """Check if token is blacklisted"""
        try:
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            redis_client = get_redis()
            if not redis_client:
                return False
            result = await redis_client.get(f"blacklist:{token_hash}")
            return result is not None
        except Exception:
            return False
    
    async def _send_verification_email(self, user: User) -> None:
        """Send email verification email"""
        if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
            # Email not configured, skip sending
            return
        
        try:
            # Create verification token
            verification_token = secrets.token_urlsafe(32)
            
            # Store token in Redis with expiration (24 hours)
            redis_client = get_redis()
            if redis_client:
                await redis_client.setex(
                    f"email_verification:{verification_token}",
                    86400,  # 24 hours
                    user.id
                )
            
            # Create email
            msg = MIMEMultipart()
            msg['From'] = settings.FROM_EMAIL
            msg['To'] = user.email
            msg['Subject'] = "Verify your CoWriteAI account"
            
            # Email body
            body = f"""
            Welcome to CoWriteAI!
            
            Please click the link below to verify your email address:
            http://localhost:3000/verify-email?token={verification_token}
            
            This link will expire in 24 hours.
            
            If you didn't create an account, please ignore this email.
            
            Best regards,
            The CoWriteAI Team
            """
            
            msg.attach(MIMEText(body, 'plain'))
            
            # Send email
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
            server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            text = msg.as_string()
            server.sendmail(settings.FROM_EMAIL, user.email, text)
            server.quit()
            
        except Exception as e:
            # Log error but don't fail registration
            print(f"Failed to send verification email: {e}")
    
    async def _send_password_reset_email(self, user: User, reset_token: str) -> None:
        """Send password reset email"""
        if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
            # Email not configured, skip sending
            return
        
        try:
            # Create email
            msg = MIMEMultipart()
            msg['From'] = settings.FROM_EMAIL
            msg['To'] = user.email
            msg['Subject'] = "Reset your CoWriteAI password"
            
            # Email body
            body = f"""
            Hello,
            
            You requested a password reset for your CoWriteAI account.
            
            Please click the link below to reset your password:
            http://localhost:3000/reset-password?token={reset_token}
            
            This link will expire in 1 hour.
            
            If you didn't request this reset, please ignore this email.
            
            Best regards,
            The CoWriteAI Team
            """
            
            msg.attach(MIMEText(body, 'plain'))
            
            # Send email
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
            server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            text = msg.as_string()
            server.sendmail(settings.FROM_EMAIL, user.email, text)
            server.quit()
            
        except Exception as e:
            # Log error but don't fail password reset
            print(f"Failed to send password reset email: {e}")