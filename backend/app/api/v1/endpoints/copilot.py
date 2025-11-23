"""
Copilot API Endpoints

Handles inline AI writing suggestions with story context
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging

from ....services.copilot_service import CopilotService
from ....core.dependencies import get_current_user
from ....models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()


class CopilotRequest(BaseModel):
    """Request model for copilot suggestions"""
    project_id: str
    file_id: Optional[str] = None
    text_before: str  # Text before cursor
    text_after: str = ""  # Text after cursor (for mid-document edits)
    cursor_position: int
    suggestion_type: str = "continue"  # continue, complete, rewrite
    max_tokens: int = 100


class CopilotResponse(BaseModel):
    """Response model for copilot suggestions"""
    suggestion: str
    context_used: Optional[Dict[str, Any]] = None
    confidence: float = 0.0


@router.post("/suggest", response_model=CopilotResponse)
async def get_suggestion(
    request: CopilotRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Generate inline writing suggestion with story context
    
    - Gathers relevant story context (characters, locations, recent events)
    - Uses Groq LLM to generate contextually appropriate suggestion
    - Returns suggestion text for inline display
    """
    try:
        logger.info(f"Copilot request from user {current_user.id} for project {request.project_id}")
        
        copilot_service = CopilotService()
        
        response = await copilot_service.generate_suggestion(
            project_id=request.project_id,
            file_id=request.file_id,
            text_before=request.text_before,
            text_after=request.text_after,
            cursor_position=request.cursor_position,
            suggestion_type=request.suggestion_type,
            max_tokens=request.max_tokens,
            user_id=current_user.id
        )
        
        logger.info(f"Copilot suggestion generated successfully")
        return response
        
    except ValueError as e:
        logger.error(f"Copilot validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        logger.error(f"Copilot error: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to generate suggestion: {str(e)}")


@router.post("/accept")
async def accept_suggestion(
    project_id: str,
    suggestion: str,
    current_user: User = Depends(get_current_user)
):
    """
    Track accepted suggestions for learning
    """
    # Future: Store accepted suggestions to improve prompts
    return {"status": "tracked"}


@router.post("/reject")
async def reject_suggestion(
    project_id: str,
    suggestion: str,
    current_user: User = Depends(get_current_user)
):
    """
    Track rejected suggestions for learning
    """
    # Future: Store rejected suggestions to improve prompts
    return {"status": "tracked"}
