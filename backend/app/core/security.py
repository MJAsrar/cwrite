from typing import Optional, Dict, Any
from fastapi import HTTPException, status, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import time
from collections import defaultdict
import asyncio

from .config import settings
from .redis import get_redis
from ..services.auth_service import AuthService
from ..models.user import User


class RateLimiter:
    """Rate limiting utility"""
    
    def __init__(self):
        self.requests = defaultdict(list)
        self.lock = asyncio.Lock()
    
    async def is_allowed(self, key: str, limit: int, window: int) -> bool:
        """
        Check if request is allowed based on rate limit
        
        Args:
            key: Unique identifier (IP, user ID, etc.)
            limit: Maximum requests allowed
            window: Time window in seconds
        
        Returns:
            True if request is allowed, False otherwise
        """
        async with self.lock:
            now = time.time()
            
            # Clean old requests
            self.requests[key] = [
                req_time for req_time in self.requests[key]
                if now - req_time < window
            ]
            
            # Check if limit exceeded
            if len(self.requests[key]) >= limit:
                return False
            
            # Add current request
            self.requests[key].append(now)
            return True


class RedisRateLimiter:
    """Redis-based rate limiter for production use"""
    
    async def is_allowed(self, key: str, limit: int, window: int) -> bool:
        """
        Check if request is allowed using Redis
        
        Args:
            key: Unique identifier (IP, user ID, etc.)
            limit: Maximum requests allowed
            window: Time window in seconds
        
        Returns:
            True if request is allowed, False otherwise
        """
        try:
            redis_client = get_redis()
            if not redis_client:
                # If Redis not available, allow the request (fail open)
                return True
            
            # Use sliding window log approach
            now = time.time()
            pipeline = redis_client.pipeline()
            
            # Remove old entries
            pipeline.zremrangebyscore(f"rate_limit:{key}", 0, now - window)
            
            # Count current entries
            pipeline.zcard(f"rate_limit:{key}")
            
            # Add current request
            pipeline.zadd(f"rate_limit:{key}", {str(now): now})
            
            # Set expiration
            pipeline.expire(f"rate_limit:{key}", window)
            
            results = await pipeline.execute()
            current_count = results[1]
            
            return current_count < limit
            
        except Exception:
            # If Redis fails, allow the request (fail open)
            return True


# Global rate limiter instance
rate_limiter = RedisRateLimiter()


async def rate_limit_dependency(request: Request, limit: int = 100, window: int = 3600):
    """
    Rate limiting dependency for FastAPI endpoints
    
    Args:
        request: FastAPI request object
        limit: Maximum requests per window (default: 100)
        window: Time window in seconds (default: 1 hour)
    """
    # Use IP address as key
    client_ip = request.client.host
    
    if not await rate_limiter.is_allowed(f"ip:{client_ip}", limit, window):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later."
        )


async def auth_rate_limit_dependency(request: Request):
    """Rate limiting for authentication endpoints (stricter limits)"""
    client_ip = request.client.host
    
    # 10 requests per 15 minutes for auth endpoints
    if not await rate_limiter.is_allowed(f"auth:{client_ip}", 10, 900):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many authentication attempts. Please try again in 15 minutes."
        )


class JWTBearer(HTTPBearer):
    """Custom JWT Bearer authentication"""
    
    def __init__(self, auto_error: bool = True):
        super(JWTBearer, self).__init__(auto_error=auto_error)
        self.auth_service = AuthService()
    
    async def __call__(self, request: Request) -> Optional[str]:
        """
        Extract and validate JWT token from request
        
        Returns:
            User ID if token is valid, None otherwise
        """
        # First try to get token from Authorization header
        credentials: HTTPAuthorizationCredentials = await super(JWTBearer, self).__call__(request)
        
        if credentials:
            token = credentials.credentials
        else:
            # Fallback to cookie
            token = request.cookies.get("access_token")
        
        if not token:
            if self.auto_error:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Not authenticated"
                )
            return None
        
        # Verify token
        user_id = await self.auth_service.verify_token(token)
        if not user_id:
            if self.auto_error:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired token"
                )
            return None
        
        return user_id


class RoleChecker:
    """Role-based access control"""
    
    def __init__(self, allowed_roles: list):
        self.allowed_roles = allowed_roles
    
    async def __call__(self, user_id: str = Depends(JWTBearer())) -> str:
        """
        Check if user has required role
        
        Args:
            user_id: User ID from JWT token
        
        Returns:
            User ID if authorized
        
        Raises:
            HTTPException: If user doesn't have required role
        """
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated"
            )
        
        # Get user from database
        auth_service = AuthService()
        user = await auth_service.user_repository.get_by_id(user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        
        return user_id


# Common dependency instances
jwt_bearer = JWTBearer()
optional_jwt_bearer = JWTBearer(auto_error=False)
admin_required = RoleChecker(["admin"])
user_required = RoleChecker(["user", "admin"])


async def get_current_user(user_id: str = Depends(jwt_bearer)) -> User:
    """
    Get current authenticated user
    
    Args:
        user_id: User ID from JWT token
    
    Returns:
        User object
    
    Raises:
        HTTPException: If user not found
    """
    auth_service = AuthService()
    user = await auth_service.user_repository.get_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


async def get_current_active_user(user: User = Depends(get_current_user)) -> User:
    """
    Get current active user (email verified)
    
    Args:
        user: User object from get_current_user
    
    Returns:
        User object if active
    
    Raises:
        HTTPException: If user is not active
    """
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not verified"
        )
    
    return user


async def get_optional_current_user(user_id: str = Depends(optional_jwt_bearer)) -> Optional[User]:
    """
    Get current user if authenticated, None otherwise
    
    Args:
        user_id: User ID from JWT token (optional)
    
    Returns:
        User object if authenticated, None otherwise
    """
    if not user_id:
        return None
    
    auth_service = AuthService()
    user = await auth_service.user_repository.get_by_id(user_id)
    return user


class SecurityHeaders:
    """Security headers middleware"""
    
    @staticmethod
    def add_security_headers(response):
        """Add security headers to response"""
        # Prevent XSS attacks
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # HSTS (only in production with HTTPS)
        if not settings.DEBUG:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # Content Security Policy
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' https:; "
            "connect-src 'self' https:; "
            "frame-ancestors 'none';"
        )
        
        return response


def verify_cors_origin(origin: str) -> bool:
    """
    Verify if origin is allowed for CORS
    
    Args:
        origin: Request origin
    
    Returns:
        True if origin is allowed
    """
    if not origin:
        return False
    
    # Check against allowed origins
    for allowed_origin in settings.CORS_ORIGINS:
        if allowed_origin == "*":
            return True
        if origin == allowed_origin:
            return True
        # Support wildcard subdomains
        if allowed_origin.startswith("*.") and origin.endswith(allowed_origin[1:]):
            return True
    
    return False