from fastapi import APIRouter, Request

from .endpoints import auth, files, search, relationships, indexing, projects, scenes, position, chat, copilot

api_router = APIRouter()

# Include authentication routes
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])

# Include file management routes (routes already have /projects prefix)
api_router.include_router(files.router, tags=["files"])

# Include search and embedding routes
api_router.include_router(search.router, prefix="/search", tags=["search"])

# Include relationship discovery routes (routes already have appropriate prefixes)
api_router.include_router(relationships.router, tags=["relationships"])

# Include indexing management routes
api_router.include_router(indexing.router, prefix="/indexing", tags=["indexing"])

# Include project management routes
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])

# Include scene management routes (Phase 1)
api_router.include_router(scenes.router, tags=["scenes"])

# Include position and mention routes (Phase 1)
api_router.include_router(position.router, tags=["position", "mentions"])

# Include chat/AI assistant routes (RAG)
api_router.include_router(chat.router, prefix="/chat", tags=["chat", "ai"])

# Include copilot routes (inline suggestions)
api_router.include_router(copilot.router, prefix="/copilot", tags=["copilot", "ai"])

# Health check endpoint
@api_router.get("/health")
async def health_check():
    """API health check endpoint"""
    return {"status": "healthy", "version": "1.0.0"}

# Debug endpoint to test database connection
@api_router.get("/debug/db")
async def debug_db():
    """Debug database connection"""
    try:
        from app.core.database import get_database
        db = get_database()
        # Test connection by listing collections
        collections = await db.list_collection_names()
        return {"status": "connected", "collections": collections}
    except Exception as e:
        return {"status": "error", "message": str(e)}

