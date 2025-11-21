"""
Position Index and Entity Mention API Endpoints
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict, Any
from bson import ObjectId

from app.repositories.position_index_repository import PositionIndexRepository
from app.repositories.entity_mention_repository import EntityMentionRepository
from app.repositories.file_repository import FileRepository
from app.models.position_index import PositionIndexResponse, LineQuery
from app.models.entity_mention import EntityMentionResponse
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


# ============ Position Index Endpoints ============

@router.get("/files/{file_id}/lines", response_model=List[PositionIndexResponse])
async def get_file_lines(
    file_id: str,
    start_line: Optional[int] = Query(None, ge=1),
    end_line: Optional[int] = Query(None, ge=1),
    current_user: User = Depends(get_current_user)
):
    """Get lines from a file, optionally filtered by range"""
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID")
    
    position_repo = PositionIndexRepository()
    
    if start_line is not None and end_line is not None:
        lines = await position_repo.get_lines_range(file_id, start_line, end_line)
    else:
        lines = await position_repo.get_by_file(file_id)
    
    return [PositionIndexResponse(**line.dict()) for line in lines]


@router.get("/files/{file_id}/lines/{line_number}", response_model=Optional[PositionIndexResponse])
async def get_line(
    file_id: str,
    line_number: int,
    current_user: User = Depends(get_current_user)
):
    """Get a specific line by line number"""
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID")
    
    position_repo = PositionIndexRepository()
    line = await position_repo.get_line(file_id, line_number)
    
    if not line:
        raise HTTPException(status_code=404, detail="Line not found")
    
    return PositionIndexResponse(**line.dict())


@router.get("/files/{file_id}/position/{char_pos}", response_model=Optional[PositionIndexResponse])
async def get_line_at_position(
    file_id: str,
    char_pos: int,
    current_user: User = Depends(get_current_user)
):
    """Get the line at a specific character position"""
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID")
    
    position_repo = PositionIndexRepository()
    line = await position_repo.get_at_position(file_id, char_pos)
    
    if not line:
        raise HTTPException(status_code=404, detail="No line at this position")
    
    return PositionIndexResponse(**line.dict())


@router.get("/scenes/{scene_id}/lines", response_model=List[PositionIndexResponse])
async def get_scene_lines(
    scene_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get all lines in a scene"""
    if not ObjectId.is_valid(scene_id):
        raise HTTPException(status_code=400, detail="Invalid scene ID")
    
    position_repo = PositionIndexRepository()
    lines = await position_repo.get_by_scene(scene_id)
    
    return [PositionIndexResponse(**line.dict()) for line in lines]


@router.get("/files/{file_id}/search-lines", response_model=List[PositionIndexResponse])
async def search_lines(
    file_id: str,
    query: str = Query(..., min_length=1),
    case_sensitive: bool = False,
    current_user: User = Depends(get_current_user)
):
    """Search for lines containing a term"""
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID")
    
    position_repo = PositionIndexRepository()
    lines = await position_repo.search_content(file_id, query, case_sensitive)
    
    return [PositionIndexResponse(**line.dict()) for line in lines]


@router.get("/files/{file_id}/dialogue-lines", response_model=List[PositionIndexResponse])
async def get_dialogue_lines(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get all lines containing dialogue"""
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID")
    
    position_repo = PositionIndexRepository()
    lines = await position_repo.get_dialogue_lines(file_id)
    
    return [PositionIndexResponse(**line.dict()) for line in lines]


# ============ Entity Mention Endpoints ============

@router.get("/entities/{entity_id}/mentions", response_model=List[EntityMentionResponse])
async def get_entity_mentions(
    entity_id: str,
    file_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get all mentions of an entity, optionally filtered by file"""
    if not ObjectId.is_valid(entity_id):
        raise HTTPException(status_code=400, detail="Invalid entity ID")
    
    mention_repo = EntityMentionRepository()
    
    if file_id:
        if not ObjectId.is_valid(file_id):
            raise HTTPException(status_code=400, detail="Invalid file ID")
        mentions = await mention_repo.get_by_entity_and_file(entity_id, file_id)
    else:
        mentions = await mention_repo.get_by_entity(entity_id)
    
    return [EntityMentionResponse(**mention.dict()) for mention in mentions]


@router.get("/files/{file_id}/entity-mentions", response_model=List[EntityMentionResponse])
async def get_file_entity_mentions(
    file_id: str,
    scene_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get all entity mentions in a file, optionally filtered by scene"""
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID")
    
    mention_repo = EntityMentionRepository()
    
    if scene_id:
        if not ObjectId.is_valid(scene_id):
            raise HTTPException(status_code=400, detail="Invalid scene ID")
        mentions = await mention_repo.get_by_scene(scene_id)
    else:
        mentions = await mention_repo.get_by_file(file_id)
    
    return [EntityMentionResponse(**mention.dict()) for mention in mentions]


@router.get("/files/{file_id}/lines/{line_number}/entities", response_model=List[EntityMentionResponse])
async def get_entities_on_line(
    file_id: str,
    line_number: int,
    current_user: User = Depends(get_current_user)
):
    """Get all entity mentions on a specific line"""
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID")
    
    mention_repo = EntityMentionRepository()
    mentions = await mention_repo.get_by_line(file_id, line_number)
    
    return [EntityMentionResponse(**mention.dict()) for mention in mentions]


@router.get("/entities/{entity_id}/first-mention", response_model=Optional[EntityMentionResponse])
async def get_first_mention(
    entity_id: str,
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get the first mention of an entity in a file"""
    if not ObjectId.is_valid(entity_id) or not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    mention_repo = EntityMentionRepository()
    mention = await mention_repo.get_first_mention(entity_id, file_id)
    
    if not mention:
        raise HTTPException(status_code=404, detail="No mentions found")
    
    return EntityMentionResponse(**mention.dict())


@router.get("/entities/{entity_id}/last-mention", response_model=Optional[EntityMentionResponse])
async def get_last_mention(
    entity_id: str,
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get the last mention of an entity in a file"""
    if not ObjectId.is_valid(entity_id) or not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    mention_repo = EntityMentionRepository()
    mention = await mention_repo.get_last_mention(entity_id, file_id)
    
    if not mention:
        raise HTTPException(status_code=404, detail="No mentions found")
    
    return EntityMentionResponse(**mention.dict())


@router.get("/entities/{entity_id}/nearby-mentions", response_model=List[EntityMentionResponse])
async def get_nearby_mentions(
    entity_id: str,
    file_id: str,
    char_pos: int = Query(..., ge=0),
    distance: int = Query(500, ge=0, le=10000),
    current_user: User = Depends(get_current_user)
):
    """Get mentions near a specific position"""
    if not ObjectId.is_valid(entity_id) or not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    mention_repo = EntityMentionRepository()
    mentions = await mention_repo.get_nearby_mentions(entity_id, file_id, char_pos, distance)
    
    return [EntityMentionResponse(**mention.dict()) for mention in mentions]


# ============ Statistics Endpoints ============

@router.get("/files/{file_id}/stats", response_model=Dict[str, Any])
async def get_file_stats(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive statistics for a file"""
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID")
    
    position_repo = PositionIndexRepository()
    mention_repo = EntityMentionRepository()
    
    # Get line stats
    total_lines = await position_repo.count_by_file(file_id)
    non_empty_lines = await position_repo.count_non_empty(file_id)
    dialogue_lines = await position_repo.count_dialogue_lines(file_id)
    total_words = await position_repo.get_total_words(file_id)
    
    # Get mention stats
    total_mentions = await mention_repo.count_by_file(file_id)
    
    return {
        'file_id': file_id,
        'total_lines': total_lines,
        'non_empty_lines': non_empty_lines,
        'empty_lines': total_lines - non_empty_lines,
        'dialogue_lines': dialogue_lines,
        'dialogue_percentage': dialogue_lines / non_empty_lines if non_empty_lines > 0 else 0,
        'total_words': total_words,
        'average_words_per_line': total_words / non_empty_lines if non_empty_lines > 0 else 0,
        'total_entity_mentions': total_mentions
    }


