from typing import Callable
from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
import time
import logging

from ..core.security import SecurityHeaders, rate_limiter, verify_cors_origin
from ..core.config import settings

logger = logging.getLogger(__name__)


class AuthMiddleware:
    """Authentication and security middleware"""
    
    def __init__(self, app: Callable):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        """ASGI middleware implementation"""
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        request = Request(scope, receive)
        
        # Apply rate limiting for authentication endpoints
        if request.url.path.startswith("/api/v1/auth/"):
            client_ip = request.client.host
            
            # Stricter rate limiting for auth endpoints
            if not await rate_limiter.is_allowed(f"auth:{client_ip}", 10, 900):  # 10 requests per 15 minutes
                response = JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={"detail": "Too many authentication attempts. Please try again in 15 minutes."}
                )
                await response(scope, receive, send)
                return
        
        # Apply general rate limiting
        elif request.url.path.startswith("/api/"):
            client_ip = request.client.host
            
            # General API rate limiting
            if not await rate_limiter.is_allowed(f"api:{client_ip}", 1000, 3600):  # 1000 requests per hour
                response = JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={"detail": "Rate limit exceeded. Please try again later."}
                )
                await response(scope, receive, send)
                return
        
        # Continue with the request
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                # Add security headers
                headers = dict(message.get("headers", []))
                
                # Convert headers to the format expected by ASGI
                security_headers = {
                    b"x-content-type-options": b"nosniff",
                    b"x-frame-options": b"DENY",
                    b"x-xss-protection": b"1; mode=block",
                }
                
                # Add HSTS in production
                if not settings.DEBUG:
                    security_headers[b"strict-transport-security"] = b"max-age=31536000; includeSubDomains"
                
                # Add CSP
                csp = (
                    "default-src 'self'; "
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                    "style-src 'self' 'unsafe-inline'; "
                    "img-src 'self' data: https:; "
                    "font-src 'self' https:; "
                    "connect-src 'self' https:; "
                    "frame-ancestors 'none';"
                )
                security_headers[b"content-security-policy"] = csp.encode()
                
                # Merge with existing headers
                for key, value in security_headers.items():
                    headers[key] = value
                
                # Convert back to ASGI format
                message["headers"] = [(k, v) for k, v in headers.items()]
            
            await send(message)
        
        await self.app(scope, receive, send_wrapper)


class RequestLoggingMiddleware:
    """Request logging middleware"""
    
    def __init__(self, app: Callable):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        """ASGI middleware implementation"""
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        request = Request(scope, receive)
        start_time = time.time()
        
        # Log request
        logger.info(
            f"Request started: {request.method} {request.url.path} "
            f"from {request.client.host}"
        )
        
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                # Calculate response time
                process_time = time.time() - start_time
                
                # Log response
                status_code = message["status"]
                logger.info(
                    f"Request completed: {request.method} {request.url.path} "
                    f"- {status_code} - {process_time:.3f}s"
                )
                
                # Add response time header
                headers = dict(message.get("headers", []))
                headers[b"x-process-time"] = str(process_time).encode()
                message["headers"] = [(k, v) for k, v in headers.items()]
            
            await send(message)
        
        await self.app(scope, receive, send_wrapper)


class CORSMiddleware:
    """Custom CORS middleware with enhanced security"""
    
    def __init__(self, app: Callable):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        """ASGI middleware implementation"""
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        request = Request(scope, receive)
        
        # Handle preflight requests
        if request.method == "OPTIONS":
            origin = request.headers.get("origin")
            
            if origin and verify_cors_origin(origin):
                response = Response()
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
                response.headers["Access-Control-Allow-Headers"] = (
                    "Accept, Accept-Language, Content-Language, Content-Type, "
                    "Authorization, X-Requested-With"
                )
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Max-Age"] = "86400"  # 24 hours
                
                await response(scope, receive, send)
                return
            else:
                # Reject preflight for invalid origins
                response = Response(status_code=403)
                await response(scope, receive, send)
                return
        
        # Handle actual requests
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                origin = request.headers.get("origin")
                
                if origin and verify_cors_origin(origin):
                    headers = dict(message.get("headers", []))
                    headers[b"access-control-allow-origin"] = origin.encode()
                    headers[b"access-control-allow-credentials"] = b"true"
                    headers[b"vary"] = b"Origin"
                    
                    message["headers"] = [(k, v) for k, v in headers.items()]
            
            await send(message)
        
        await self.app(scope, receive, send_wrapper)


class ErrorHandlingMiddleware:
    """Global error handling middleware"""
    
    def __init__(self, app: Callable):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        """ASGI middleware implementation"""
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        try:
            await self.app(scope, receive, send)
        except Exception as e:
            request = Request(scope, receive)
            
            # Log the error
            logger.error(
                f"Unhandled error in {request.method} {request.url.path}: {str(e)}",
                exc_info=True
            )
            
            # Return generic error response
            if settings.DEBUG:
                error_detail = str(e)
            else:
                error_detail = "Internal server error"
            
            response = JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "error": "internal_server_error",
                    "message": error_detail,
                    "timestamp": time.time()
                }
            )
            
            await response(scope, receive, send)