"""
Genres API Endpoint

Returns available writing genres with metadata and model info.
"""

from fastapi import APIRouter
from typing import List, Dict, Any

from app.services.huggingface_service import HuggingFaceService

router = APIRouter()


@router.get("/", response_model=List[Dict[str, Any]])
async def list_genres():
    """
    Get list of available writing genres.

    Returns genre options with labels, descriptions, emojis,
    and associated HuggingFace model info.
    """
    hf_service = HuggingFaceService()
    return hf_service.get_available_genres()
