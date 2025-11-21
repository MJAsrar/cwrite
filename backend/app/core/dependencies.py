"""
Core dependencies for FastAPI endpoints

This module provides common dependencies used across API endpoints.
"""

from fastapi import Depends, HTTPException, Request, status
from typing import Optional

from ..models.user import User
from ..services.auth_service import AuthService


async def get_current_user(request: Request) -> User:
    """
    Get current authenticated user from request
    
    Args:
        request: FastAPI request object
        
    Returns:
        Current authenticated user
        
    Raises:
        HTTPException: If user is not authenticated or not found
    """
    try:
        # Get access token from cookie or Authorization header
        access_token = request.cookies.get("access_token")
        
        # If no cookie, try Authorization header
        if not access_token:
            auth_header = request.headers.get("authorization")
            if auth_header and auth_header.startswith("Bearer "):
                access_token = auth_header.split(" ")[1]
        
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated"
            )
        
        # Initialize auth service
        auth_service = AuthService()
        
        # Verify token
        user_id = await auth_service.verify_token(access_token)
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        # Get user
        user = await auth_service.user_repository.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to authenticate user"
        )


async def get_optional_current_user(request: Request) -> Optional[User]:
    """
    Get current authenticated user from request (optional)
    
    Args:
        request: FastAPI request object
        
    Returns:
        Current authenticated user or None if not authenticated
    """
    try:
        return await get_current_user(request)
    except HTTPException:
        return None
    except Exception:
        return None