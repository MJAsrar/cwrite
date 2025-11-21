"""
Projects API endpoints

This module provides CRUD operations for project management.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime

from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.project import (
    Project, 
    ProjectCreate, 
    ProjectUpdate, 
    ProjectResponse,
    ProjectSettings,
    IndexingStatus
)
from app.repositories.project_repository import ProjectRepository

router = APIRouter()

# Initialize repository
project_repository = ProjectRepository()


# Request/Response Models
class CreateProjectRequest(ProjectCreate):
    """Request model for creating a project"""
    pass


class UpdateProjectRequest(ProjectUpdate):
    """Request model for updating a project"""
    pass


class ProjectListResponse(ProjectResponse):
    """Response model for project list items"""
    pass


# Helper functions
def _project_to_response(project: Project) -> ProjectResponse:
    """Convert Project model to ProjectResponse"""
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        owner_id=project.owner_id,
        created_at=project.created_at,
        updated_at=project.updated_at,
        settings=project.settings,
        stats=project.stats,
        indexing_status=project.indexing_status
    )


async def _get_user_project(project_id: str, user: User) -> Project:
    """Get project by ID and verify ownership"""
    project = await project_repository.get_by_id(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    if project.owner_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this project"
        )
    
    return project

# Endpoints
@router.get("/", response_model=List[ProjectListResponse])
async def list_projects(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    """
    Get list of projects for the current user
    
    Args:
        skip: Number of projects to skip (for pagination)
        limit: Maximum number of projects to return
        current_user: Current authenticated user
        
    Returns:
        List of user's projects
    """
    try:
        # Validate pagination parameters
        if skip < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Skip parameter must be non-negative"
            )
        
        if limit <= 0 or limit > 1000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Limit parameter must be between 1 and 1000"
            )
        
        # Get projects for the user
        projects = await project_repository.get_by_owner(
            owner_id=current_user.id,
            skip=skip,
            limit=limit
        )
        
        # Convert to response models
        return [_project_to_response(project) for project in projects]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve projects"
        )

@router.post("/", response_model=ProjectResponse)
async def create_project(
    request: CreateProjectRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Create a new project for the current user
    
    Args:
        request: Project creation request data
        current_user: Current authenticated user
        
    Returns:
        Created project
    """
    try:
        # Check if project name already exists for this user
        existing_project = await project_repository.get_by_owner_and_name(
            owner_id=current_user.id,
            name=request.name
        )
        
        if existing_project:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A project with this name already exists"
            )
        
        # Create new project
        now = datetime.utcnow()
        project = Project(
            name=request.name,
            description=request.description,
            owner_id=current_user.id,
            created_at=now,
            updated_at=now,
            settings=request.settings or ProjectSettings(),
            indexing_status=IndexingStatus.PENDING
        )
        
        # Save to database
        created_project = await project_repository.create(project)
        if not created_project:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create project"
            )
        
        return _project_to_response(created_project)
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create project"
        )
@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific project by ID
    
    Args:
        project_id: Project ID
        current_user: Current authenticated user
        
    Returns:
        Project details
    """
    try:
        project = await _get_user_project(project_id, current_user)
        return _project_to_response(project)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve project"
        )


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    request: UpdateProjectRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Update a specific project
    
    Args:
        project_id: Project ID
        request: Project update request data
        current_user: Current authenticated user
        
    Returns:
        Updated project
    """
    try:
        # Verify project exists and user owns it
        project = await _get_user_project(project_id, current_user)
        
        # Check if new name conflicts with existing projects (if name is being changed)
        if request.name and request.name != project.name:
            existing_project = await project_repository.get_by_owner_and_name(
                owner_id=current_user.id,
                name=request.name
            )
            
            if existing_project:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A project with this name already exists"
                )
        
        # Prepare update data
        update_data = {}
        if request.name is not None:
            update_data["name"] = request.name
        if request.description is not None:
            update_data["description"] = request.description
        if request.settings is not None:
            update_data["settings"] = request.settings.dict()
        
        # Always update the updated_at timestamp
        update_data["updated_at"] = datetime.utcnow()
        
        # Update project
        updated_project = await project_repository.update_by_id(project_id, update_data)
        if not updated_project:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update project"
            )
        
        return _project_to_response(updated_project)
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update project"
        )


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete a specific project
    
    Args:
        project_id: Project ID
        current_user: Current authenticated user
        
    Returns:
        Success message
    """
    try:
        # Verify project exists and user owns it
        await _get_user_project(project_id, current_user)
        
        # Delete the project
        success = await project_repository.delete_by_id(project_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete project"
            )
        
        return {"message": "Project deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete project"
        )