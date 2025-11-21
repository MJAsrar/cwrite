"""
Scene API Endpoints
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from bson import ObjectId

from app.repositories.scene_repository import SceneRepository
from app.repositories.file_repository import FileRepository
from app.models.scene import Scene, SceneResponse, SceneUpdate
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


@router.get("/files/{file_id}/scenes", response_model=List[SceneResponse])
async def get_file_scenes(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get all scenes for a file"""
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID")
    
    # Verify file exists and user has access
    file_repo = FileRepository()
    file_obj = await file_repo.get_by_id(file_id)
    if not file_obj:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Get scenes
    scene_repo = SceneRepository()
    scenes = await scene_repo.get_by_file(file_id)
    
    return [SceneResponse(**scene.dict()) for scene in scenes]


@router.get("/files/{file_id}/scenes/{scene_number}", response_model=SceneResponse)
async def get_scene_by_number(
    file_id: str,
    scene_number: int,
    current_user: User = Depends(get_current_user)
):
    """Get a specific scene by its number"""
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID")
    
    scene_repo = SceneRepository()
    scene = await scene_repo.get_scene_by_number(file_id, scene_number)
    
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    
    return SceneResponse(**scene.dict())


@router.get("/files/{file_id}/chapters", response_model=List[int])
async def get_file_chapters(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get list of chapter numbers in a file"""
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID")
    
    scene_repo = SceneRepository()
    chapters = await scene_repo.get_chapters(file_id)
    
    return chapters


@router.get("/files/{file_id}/chapters/{chapter_number}/scenes", response_model=List[SceneResponse])
async def get_chapter_scenes(
    file_id: str,
    chapter_number: int,
    current_user: User = Depends(get_current_user)
):
    """Get all scenes in a specific chapter"""
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID")
    
    scene_repo = SceneRepository()
    scenes = await scene_repo.get_by_chapter(file_id, chapter_number)
    
    return [SceneResponse(**scene.dict()) for scene in scenes]


@router.get("/projects/{project_id}/scenes/by-character/{entity_id}", response_model=List[SceneResponse])
async def get_scenes_with_character(
    project_id: str,
    entity_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get all scenes where a character appears"""
    if not ObjectId.is_valid(project_id) or not ObjectId.is_valid(entity_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    scene_repo = SceneRepository()
    scenes = await scene_repo.get_by_character(project_id, entity_id)
    
    return [SceneResponse(**scene.dict()) for scene in scenes]


@router.patch("/scenes/{scene_id}", response_model=SceneResponse)
async def update_scene(
    scene_id: str,
    scene_update: SceneUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update scene metadata (summary, POV, mood, etc.)"""
    if not ObjectId.is_valid(scene_id):
        raise HTTPException(status_code=400, detail="Invalid scene ID")
    
    scene_repo = SceneRepository()
    scene = await scene_repo.get_by_id(scene_id)
    
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    
    # Update fields
    update_data = scene_update.dict(exclude_none=True)
    updated_scene = await scene_repo.update_by_id(scene_id, update_data)
    
    if not updated_scene:
        raise HTTPException(status_code=500, detail="Failed to update scene")
    
    return SceneResponse(**updated_scene.dict())


@router.get("/files/{file_id}/scenes/at-position/{char_pos}", response_model=Optional[SceneResponse])
async def get_scene_at_position(
    file_id: str,
    char_pos: int,
    current_user: User = Depends(get_current_user)
):
    """Get the scene at a specific character position"""
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID")
    
    scene_repo = SceneRepository()
    scene = await scene_repo.get_scene_at_position(file_id, char_pos)
    
    if not scene:
        return None
    
    return SceneResponse(**scene.dict())


@router.get("/files/{file_id}/scenes/dialogue-heavy", response_model=List[SceneResponse])
async def get_dialogue_heavy_scenes(
    file_id: str,
    min_percentage: float = Query(0.5, ge=0.0, le=1.0),
    current_user: User = Depends(get_current_user)
):
    """Get scenes with high dialogue percentage"""
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID")
    
    scene_repo = SceneRepository()
    scenes = await scene_repo.get_dialogue_heavy_scenes(file_id, min_percentage)
    
    return [SceneResponse(**scene.dict()) for scene in scenes]


# ============ PHASE 2 ENDPOINTS ============

@router.get("/files/{file_id}/scenes/by-pov/{pov_type}", response_model=List[SceneResponse])
async def get_scenes_by_pov(
    file_id: str,
    pov_type: str,
    current_user: User = Depends(get_current_user)
):
    """Get scenes by POV type (first_person, third_person_limited, etc.)"""
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID")
    
    scene_repo = SceneRepository()
    scenes = await scene_repo.get_by_file(file_id)
    
    # Filter by POV type
    filtered_scenes = [s for s in scenes if s.pov_type == pov_type]
    
    return [SceneResponse(**scene.dict()) for scene in filtered_scenes]


@router.get("/files/{file_id}/scenes/by-type/{scene_type}", response_model=List[SceneResponse])
async def get_scenes_by_type(
    file_id: str,
    scene_type: str,
    current_user: User = Depends(get_current_user)
):
    """Get scenes by type (action, dialogue, description, introspection, etc.)"""
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID")
    
    scene_repo = SceneRepository()
    scenes = await scene_repo.get_by_file(file_id)
    
    # Filter by scene type
    filtered_scenes = [s for s in scenes if s.scene_type == scene_type]
    
    return [SceneResponse(**scene.dict()) for scene in filtered_scenes]


@router.get("/files/{file_id}/scenes/by-significance/{significance}", response_model=List[SceneResponse])
async def get_scenes_by_significance(
    file_id: str,
    significance: str,
    current_user: User = Depends(get_current_user)
):
    """Get scenes by significance (opening, climax, cliffhanger, resolution, etc.)"""
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID")
    
    scene_repo = SceneRepository()
    scenes = await scene_repo.get_by_file(file_id)
    
    # Filter by significance
    filtered_scenes = [s for s in scenes if s.scene_significance == significance]
    
    return [SceneResponse(**scene.dict()) for scene in filtered_scenes]


@router.get("/files/{file_id}/timeline", response_model=List[SceneResponse])
async def get_chronological_timeline(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get scenes in chronological order (not narrative order)"""
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID")
    
    scene_repo = SceneRepository()
    scenes = await scene_repo.get_by_file(file_id)
    
    # Sort by temporal_order
    sorted_scenes = sorted(scenes, key=lambda s: s.temporal_order or s.scene_number)
    
    return [SceneResponse(**scene.dict()) for scene in sorted_scenes]


@router.get("/files/{file_id}/flashbacks", response_model=List[SceneResponse])
async def get_flashback_scenes(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get all flashback scenes"""
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID")
    
    scene_repo = SceneRepository()
    scenes = await scene_repo.get_by_file(file_id)
    
    # Filter flashbacks
    flashbacks = [s for s in scenes if s.is_flashback]
    
    return [SceneResponse(**scene.dict()) for scene in flashbacks]


@router.get("/files/{file_id}/pov-shifts")
async def get_pov_shifts(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get scenes with POV shifts"""
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID")
    
    scene_repo = SceneRepository()
    scenes = await scene_repo.get_by_file(file_id)
    
    # Find scenes with POV shifts
    scenes_with_shifts = [
        {
            'scene_number': s.scene_number,
            'pov_shifts': s.pov_shifts,
            'chapter_number': s.chapter_number
        }
        for s in scenes if s.pov_shifts and len(s.pov_shifts) > 0
    ]
    
    return scenes_with_shifts


@router.get("/files/{file_id}/emotional-distribution")
async def get_emotional_distribution(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get distribution of emotional tones across scenes"""
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID")
    
    scene_repo = SceneRepository()
    scenes = await scene_repo.get_by_file(file_id)
    
    # Count emotions
    emotion_counts = {}
    for scene in scenes:
        for emotion in scene.emotional_tone:
            emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
    
    return {
        'total_scenes': len(scenes),
        'emotions': emotion_counts
    }


@router.get("/files/{file_id}/analysis-summary")
async def get_file_analysis_summary(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive Phase 2 analysis summary"""
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID")
    
    scene_repo = SceneRepository()
    scenes = await scene_repo.get_by_file(file_id)
    
    # Aggregate statistics
    pov_distribution = {}
    scene_type_distribution = {}
    significance_distribution = {}
    flashback_count = 0
    pov_shift_count = 0
    
    for scene in scenes:
        # POV
        if scene.pov_type:
            pov_distribution[scene.pov_type] = pov_distribution.get(scene.pov_type, 0) + 1
        
        # Scene type
        if scene.scene_type:
            scene_type_distribution[scene.scene_type] = scene_type_distribution.get(scene.scene_type, 0) + 1
        
        # Significance
        if scene.scene_significance:
            significance_distribution[scene.scene_significance] = significance_distribution.get(scene.scene_significance, 0) + 1
        
        # Flashbacks
        if scene.is_flashback:
            flashback_count += 1
        
        # POV shifts
        if scene.pov_shifts:
            pov_shift_count += len(scene.pov_shifts)
    
    return {
        'total_scenes': len(scenes),
        'pov_distribution': pov_distribution,
        'scene_type_distribution': scene_type_distribution,
        'significance_distribution': significance_distribution,
        'flashback_count': flashback_count,
        'pov_shift_count': pov_shift_count,
        'avg_scene_length': sum(s.word_count for s in scenes) / len(scenes) if scenes else 0
    }

