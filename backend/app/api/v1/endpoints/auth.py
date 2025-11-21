from datetime import timedelta
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr

from ....services.auth_service import AuthService
from ....models.user import UserCreate, UserLogin, PasswordReset, PasswordResetConfirm
from ....core.config import settings
from ....core.security import auth_rate_limit_dependency, rate_limit_dependency


router = APIRouter()
security = HTTPBearer()
auth_service = AuthService()


class TokenResponse(BaseModel):
    """Token response model"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    """User response model"""
    id: str
    email: str
    role: str
    email_verified: bool
    created_at: str
    settings: Dict[str, Any]


class AuthResponse(BaseModel):
    """Authentication response model"""
    user: UserResponse
    tokens: TokenResponse


class MessageResponse(BaseModel):
    """Generic message response"""
    message: str


class EmailVerificationRequest(BaseModel):
    """Email verification request"""
    token: str


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(auth_rate_limit_dependency)])
async def register(user_data: UserCreate, response: Response):
    """
    Register a new user account
    
    - **email**: Valid email address
    - **password**: Password (min 8 chars, must contain letter and number)
    - **confirm_password**: Password confirmation
    """
    try:
        # Register user
        user = await auth_service.register_user(user_data)
        
        # Create tokens
        access_token = auth_service.create_access_token(user.id)
        refresh_token = auth_service.create_refresh_token(user.id)
        
        # Set HTTP-only cookies
        response.set_cookie(
            key="access_token",
            value=access_token,
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            httponly=True,
            secure=not settings.DEBUG,  # HTTPS in production
            samesite="lax"
        )
        
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
            httponly=True,
            secure=not settings.DEBUG,  # HTTPS in production
            samesite="lax"
        )
        
        return AuthResponse(
            user=UserResponse(
                id=user.id,
                email=user.email,
                role=user.role,
                email_verified=user.email_verified,
                created_at=user.created_at.isoformat() if user.created_at else "",
                settings=user.settings.dict()
            ),
            tokens=TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post("/login", response_model=AuthResponse, dependencies=[Depends(auth_rate_limit_dependency)])
async def login(credentials: UserLogin, response: Response):
    """
    Authenticate user and return tokens
    
    - **email**: User email address
    - **password**: User password
    """
    try:
        # Authenticate user
        user = await auth_service.authenticate_user(credentials)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Create tokens
        access_token = auth_service.create_access_token(user.id)
        refresh_token = auth_service.create_refresh_token(user.id)
        
        # Set HTTP-only cookies
        response.set_cookie(
            key="access_token",
            value=access_token,
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            httponly=True,
            secure=not settings.DEBUG,  # HTTPS in production
            samesite="lax"
        )
        
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
            httponly=True,
            secure=not settings.DEBUG,  # HTTPS in production
            samesite="lax"
        )
        
        return AuthResponse(
            user=UserResponse(
                id=user.id,
                email=user.email,
                role=user.role,
                email_verified=user.email_verified,
                created_at=user.created_at.isoformat() if user.created_at else "",
                settings=user.settings.dict()
            ),
            tokens=TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@router.post("/logout", response_model=MessageResponse)
async def logout(request: Request, response: Response):
    """
    Logout user and invalidate tokens
    """
    try:
        # Get tokens from cookies
        access_token = request.cookies.get("access_token")
        refresh_token = request.cookies.get("refresh_token")
        
        # Logout user (blacklist tokens)
        if access_token:
            await auth_service.logout_user(access_token, refresh_token)
        
        # Clear cookies
        response.delete_cookie(key="access_token", httponly=True, samesite="lax")
        response.delete_cookie(key="refresh_token", httponly=True, samesite="lax")
        
        return MessageResponse(message="Successfully logged out")
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: Request, response: Response):
    """
    Refresh access token using refresh token
    """
    try:
        # Get refresh token from cookie
        refresh_token = request.cookies.get("refresh_token")
        if not refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token not found"
            )
        
        # Refresh tokens
        tokens = await auth_service.refresh_access_token(refresh_token)
        if not tokens:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Set new cookies
        response.set_cookie(
            key="access_token",
            value=tokens["access_token"],
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            httponly=True,
            secure=not settings.DEBUG,
            samesite="lax"
        )
        
        response.set_cookie(
            key="refresh_token",
            value=tokens["refresh_token"],
            max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
            httponly=True,
            secure=not settings.DEBUG,
            samesite="lax"
        )
        
        return TokenResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )


@router.post("/forgot-password", response_model=MessageResponse, dependencies=[Depends(auth_rate_limit_dependency)])
async def forgot_password(request: PasswordReset):
    """
    Request password reset email
    
    - **email**: User email address
    """
    try:
        # Create password reset token (always return success for security)
        await auth_service.create_password_reset_token(request.email)
        
        return MessageResponse(
            message="If an account with this email exists, a password reset link has been sent"
        )
        
    except Exception as e:
        # Always return success for security (don't reveal if email exists)
        return MessageResponse(
            message="If an account with this email exists, a password reset link has been sent"
        )


@router.post("/reset-password", response_model=MessageResponse, dependencies=[Depends(auth_rate_limit_dependency)])
async def reset_password(request: PasswordResetConfirm):
    """
    Reset password using reset token
    
    - **token**: Password reset token from email
    - **new_password**: New password
    - **confirm_password**: Password confirmation
    """
    try:
        success = await auth_service.reset_password(request.token, request.new_password)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        return MessageResponse(message="Password successfully reset")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset failed"
        )


@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(request: EmailVerificationRequest):
    """
    Verify user email address
    
    - **token**: Email verification token from email
    """
    try:
        success = await auth_service.verify_email(request.token)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification token"
            )
        
        return MessageResponse(message="Email successfully verified")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Email verification failed"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user(request: Request):
    """
    Get current authenticated user information
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
        
        return UserResponse(
            id=user.id,
            email=user.email,
            role=user.role,
            email_verified=user.email_verified,
            created_at=user.created_at.isoformat() if user.created_at else "",
            settings=user.settings.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user information"
        )