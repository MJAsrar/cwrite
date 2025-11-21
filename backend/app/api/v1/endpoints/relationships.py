"""
Relationship API endpoints

This module provides REST API endpoints for relationship discovery and management.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from typing import List, Optional, Dict, Any
import logging

from ....core.dependencies import get_current_user
from ....models.user import User
from ....models.relationship import (
    Relationship, RelationshipResponse, RelationshipCreate, 
    RelationshipUpdate, RelationshipFilter, RelationshipType
)
from ....repositories.entity_repository import EntityRepository
from ....repositories.relationship_repository import RelationshipRepository
from ....repositories.text_chunk_repository import TextChunkRepository
from ....repositories.project_repository import ProjectRepository
from ....services.relationship_discovery_service import RelationshipDiscoveryService

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize repositories
project_repository = ProjectRepository()

# Dependency injection
def get_entity_repository() -> EntityRepository:
    return EntityRepository()

def get_relationship_repository() -> RelationshipRepository:
    return RelationshipRepository()

def get_text_chunk_repository() -> TextChunkRepository:
    return TextChunkRepository()

def get_project_repository() -> ProjectRepository:
    return ProjectRepository()

def get_relationship_discovery_service(
    entity_repo: EntityRepository = Depends(get_entity_repository),
    relationship_repo: RelationshipRepository = Depends(get_relationship_repository),
    text_chunk_repo: TextChunkRepository = Depends(get_text_chunk_repository)
) -> RelationshipDiscoveryService:
    return RelationshipDiscoveryService(entity_repo, relationship_repo, text_chunk_repo)


@router.post("/projects/{project_id}/relationships/discover")
async def discover_project_relationships(
    project_id: str,
    background_tasks: BackgroundTasks,
    force_rediscovery: bool = Query(False, description="Force rediscovery of existing relationships"),
    current_user: User = Depends(get_current_user),
    project_repo: ProjectRepository = Depends(get_project_repository),
    discovery_service: RelationshipDiscoveryService = Depends(get_relationship_discovery_service)
):
    """
    Discover relationships between entities in a project
    """
    try:
        # Verify project ownership
        project = await project_repo.get_by_id(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this project")
        
        # Start relationship discovery in background
        background_tasks.add_task(
            discovery_service.discover_relationships_for_project,
            project_id,
            force_rediscovery
        )
        
        return {
            "message": "Relationship discovery started",
            "project_id": project_id,
            "force_rediscovery": force_rediscovery
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting relationship discovery: {e}")
        raise HTTPException(status_code=500, detail="Failed to start relationship discovery")


@router.post("/projects/{project_id}/entities/relationships/discover")
async def discover_entity_relationships(
    project_id: str,
    entity_ids: List[str],
    current_user: User = Depends(get_current_user),
    project_repo: ProjectRepository = Depends(get_project_repository),
    discovery_service: RelationshipDiscoveryService = Depends(get_relationship_discovery_service)
) -> List[RelationshipResponse]:
    """
    Discover relationships for specific entities
    """
    try:
        # Verify project ownership
        project = await project_repo.get_by_id(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this project")
        
        # Discover relationships
        relationships = await discovery_service.discover_relationships_for_entities(
            project_id, entity_ids
        )
        
        # Convert to response models
        return [
            RelationshipResponse(
                id=rel.id,
                project_id=rel.project_id,
                source_entity_id=rel.source_entity_id,
                target_entity_id=rel.target_entity_id,
                relationship_type=rel.relationship_type,
                strength=rel.strength,
                co_occurrence_count=rel.co_occurrence_count,
                context_snippets=rel.context_snippets,
                created_at=rel.created_at,
                updated_at=rel.updated_at
            )
            for rel in relationships
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error discovering entity relationships: {e}")
        raise HTTPException(status_code=500, detail="Failed to discover entity relationships")


@router.get("/projects/{project_id}/entities")
async def list_project_entities(
    project_id: str,
    entity_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    entity_repo: EntityRepository = Depends(get_entity_repository)
):
    """
    Get all entities for a project
    
    Args:
        project_id: The project ID
        entity_type: Optional filter by entity type
        skip: Number of entities to skip (pagination)
        limit: Maximum number of entities to return
        current_user: Current authenticated user
        entity_repo: Entity repository dependency
        
    Returns:
        List of entities in the project
    """
    try:
        # Verify project exists and user has access
        project = await project_repository.get_by_id(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get entities with optional type filter
        if entity_type:
            from app.models.entity import EntityType
            entities = await entity_repo.get_by_project_and_type(
                project_id, EntityType(entity_type), skip=skip, limit=limit
            )
        else:
            entities = await entity_repo.get_by_project(project_id, skip=skip, limit=limit)
        
        # Convert to response format ensuring 'id' field is present
        result = []
        for entity in entities:
            entity_dict = entity.dict(by_alias=False)  # Use 'id' not '_id'
            # Ensure id is present
            if entity_dict.get('id'):
                result.append(entity_dict)
            else:
                logger.warning(f"Entity missing ID: {entity_dict.get('name', 'unknown')}")
        
        return result
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid entity type: {str(e)}")
    except Exception as e:
        logger.error(f"Error listing entities for project {project_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to list entities")


@router.get("/projects/{project_id}/relationships")
async def get_project_relationships(
    project_id: str,
    relationship_type: Optional[RelationshipType] = Query(None, description="Filter by relationship type"),
    min_strength: Optional[float] = Query(None, description="Minimum relationship strength"),
    skip: int = Query(0, ge=0, description="Number of relationships to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of relationships to return"),
    current_user: User = Depends(get_current_user),
    project_repo: ProjectRepository = Depends(get_project_repository),
    relationship_repo: RelationshipRepository = Depends(get_relationship_repository)
) -> List[RelationshipResponse]:
    """
    Get relationships for a project with optional filtering
    """
    try:
        # Verify project ownership
        project = await project_repo.get_by_id(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this project")
        
        # Get relationships based on filters
        if relationship_type:
            relationships = await relationship_repo.get_by_type(
                project_id, relationship_type, skip, limit
            )
        elif min_strength is not None:
            relationships = await relationship_repo.get_strong_relationships(
                project_id, min_strength, skip, limit
            )
        else:
            relationships = await relationship_repo.get_by_project(
                project_id, skip, limit
            )
        
        # Fetch entity names for relationships
        entity_repo = EntityRepository()
        entity_ids = set()
        for rel in relationships:
            entity_ids.add(rel.source_entity_id)
            entity_ids.add(rel.target_entity_id)
        
        # Create entity ID -> name mapping
        entity_map = {}
        for entity_id in entity_ids:
            entity = await entity_repo.get_by_id(entity_id)
            if entity:
                entity_map[entity_id] = entity.name
        
        # Convert to response models with entity names
        return [
            RelationshipResponse(
                id=rel.id,
                project_id=rel.project_id,
                source_entity_id=rel.source_entity_id,
                target_entity_id=rel.target_entity_id,
                source_entity_name=entity_map.get(rel.source_entity_id, 'Unknown'),
                target_entity_name=entity_map.get(rel.target_entity_id, 'Unknown'),
                relationship_type=rel.relationship_type,
                strength=rel.strength,
                co_occurrence_count=rel.co_occurrence_count,
                context_snippets=rel.context_snippets,
                created_at=rel.created_at,
                updated_at=rel.updated_at
            )
            for rel in relationships
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting project relationships: {e}")
        raise HTTPException(status_code=500, detail="Failed to get project relationships")


@router.get("/entities/{entity_id}/relationships")
async def get_entity_relationships(
    entity_id: str,
    skip: int = Query(0, ge=0, description="Number of relationships to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of relationships to return"),
    current_user: User = Depends(get_current_user),
    entity_repo: EntityRepository = Depends(get_entity_repository),
    relationship_repo: RelationshipRepository = Depends(get_relationship_repository),
    project_repo: ProjectRepository = Depends(get_project_repository)
) -> List[RelationshipResponse]:
    """
    Get relationships for a specific entity
    """
    try:
        # Verify entity exists and user has access
        entity = await entity_repo.get_by_id(entity_id)
        if not entity:
            raise HTTPException(status_code=404, detail="Entity not found")
        
        project = await project_repo.get_by_id(entity.project_id)
        if not project or project.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this entity")
        
        # Get relationships
        relationships = await relationship_repo.get_by_entity(entity_id, skip, limit)
        
        # Convert to response models
        return [
            RelationshipResponse(
                id=rel.id,
                project_id=rel.project_id,
                source_entity_id=rel.source_entity_id,
                target_entity_id=rel.target_entity_id,
                relationship_type=rel.relationship_type,
                strength=rel.strength,
                co_occurrence_count=rel.co_occurrence_count,
                context_snippets=rel.context_snippets,
                created_at=rel.created_at,
                updated_at=rel.updated_at
            )
            for rel in relationships
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting entity relationships: {e}")
        raise HTTPException(status_code=500, detail="Failed to get entity relationships")


@router.get("/entities/{entity_id}/network")
async def get_entity_network(
    entity_id: str,
    max_depth: int = Query(2, ge=1, le=5, description="Maximum relationship depth"),
    min_strength: float = Query(0.1, ge=0.0, le=1.0, description="Minimum relationship strength"),
    current_user: User = Depends(get_current_user),
    entity_repo: EntityRepository = Depends(get_entity_repository),
    project_repo: ProjectRepository = Depends(get_project_repository),
    discovery_service: RelationshipDiscoveryService = Depends(get_relationship_discovery_service)
) -> Dict[str, Any]:
    """
    Get relationship network for an entity
    """
    try:
        # Verify entity exists and user has access
        entity = await entity_repo.get_by_id(entity_id)
        if not entity:
            raise HTTPException(status_code=404, detail="Entity not found")
        
        project = await project_repo.get_by_id(entity.project_id)
        if not project or project.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this entity")
        
        # Get network
        network = await discovery_service.get_entity_relationship_network(
            entity_id, max_depth, min_strength
        )
        
        return network
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting entity network: {e}")
        raise HTTPException(status_code=500, detail="Failed to get entity network")


@router.get("/relationships/{relationship_id}")
async def get_relationship(
    relationship_id: str,
    current_user: User = Depends(get_current_user),
    relationship_repo: RelationshipRepository = Depends(get_relationship_repository),
    project_repo: ProjectRepository = Depends(get_project_repository)
) -> RelationshipResponse:
    """
    Get a specific relationship by ID
    """
    try:
        # Get relationship
        relationship = await relationship_repo.get_by_id(relationship_id)
        if not relationship:
            raise HTTPException(status_code=404, detail="Relationship not found")
        
        # Verify user has access to the project
        project = await project_repo.get_by_id(relationship.project_id)
        if not project or project.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this relationship")
        
        return RelationshipResponse(
            id=relationship.id,
            project_id=relationship.project_id,
            source_entity_id=relationship.source_entity_id,
            target_entity_id=relationship.target_entity_id,
            relationship_type=relationship.relationship_type,
            strength=relationship.strength,
            co_occurrence_count=relationship.co_occurrence_count,
            context_snippets=relationship.context_snippets,
            created_at=relationship.created_at,
            updated_at=relationship.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting relationship: {e}")
        raise HTTPException(status_code=500, detail="Failed to get relationship")


@router.put("/relationships/{relationship_id}")
async def update_relationship(
    relationship_id: str,
    relationship_update: RelationshipUpdate,
    current_user: User = Depends(get_current_user),
    relationship_repo: RelationshipRepository = Depends(get_relationship_repository),
    project_repo: ProjectRepository = Depends(get_project_repository)
) -> RelationshipResponse:
    """
    Update a relationship
    """
    try:
        # Get existing relationship
        relationship = await relationship_repo.get_by_id(relationship_id)
        if not relationship:
            raise HTTPException(status_code=404, detail="Relationship not found")
        
        # Verify user has access to the project
        project = await project_repo.get_by_id(relationship.project_id)
        if not project or project.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to update this relationship")
        
        # Prepare update data
        update_data = {}
        if relationship_update.relationship_type is not None:
            update_data["relationship_type"] = relationship_update.relationship_type
        if relationship_update.strength is not None:
            update_data["strength"] = relationship_update.strength
        if relationship_update.context_snippet is not None:
            # Add new context snippet
            await relationship_repo.add_context_snippet(
                relationship_id, relationship_update.context_snippet
            )
        
        # Update relationship
        if update_data:
            updated_relationship = await relationship_repo.update_by_id(
                relationship_id, update_data
            )
        else:
            updated_relationship = relationship
        
        if not updated_relationship:
            raise HTTPException(status_code=500, detail="Failed to update relationship")
        
        return RelationshipResponse(
            id=updated_relationship.id,
            project_id=updated_relationship.project_id,
            source_entity_id=updated_relationship.source_entity_id,
            target_entity_id=updated_relationship.target_entity_id,
            relationship_type=updated_relationship.relationship_type,
            strength=updated_relationship.strength,
            co_occurrence_count=updated_relationship.co_occurrence_count,
            context_snippets=updated_relationship.context_snippets,
            created_at=updated_relationship.created_at,
            updated_at=updated_relationship.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating relationship: {e}")
        raise HTTPException(status_code=500, detail="Failed to update relationship")


@router.delete("/relationships/{relationship_id}")
async def delete_relationship(
    relationship_id: str,
    current_user: User = Depends(get_current_user),
    relationship_repo: RelationshipRepository = Depends(get_relationship_repository),
    project_repo: ProjectRepository = Depends(get_project_repository)
):
    """
    Delete a relationship
    """
    try:
        # Get relationship
        relationship = await relationship_repo.get_by_id(relationship_id)
        if not relationship:
            raise HTTPException(status_code=404, detail="Relationship not found")
        
        # Verify user has access to the project
        project = await project_repo.get_by_id(relationship.project_id)
        if not project or project.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this relationship")
        
        # Delete relationship
        success = await relationship_repo.delete_by_id(relationship_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete relationship")
        
        return {"message": "Relationship deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting relationship: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete relationship")


@router.post("/relationships/{relationship_id}/recalculate-strength")
async def recalculate_relationship_strength(
    relationship_id: str,
    additional_factors: Optional[Dict[str, float]] = None,
    current_user: User = Depends(get_current_user),
    relationship_repo: RelationshipRepository = Depends(get_relationship_repository),
    project_repo: ProjectRepository = Depends(get_project_repository),
    discovery_service: RelationshipDiscoveryService = Depends(get_relationship_discovery_service)
):
    """
    Recalculate relationship strength using advanced algorithms
    """
    try:
        # Get relationship
        relationship = await relationship_repo.get_by_id(relationship_id)
        if not relationship:
            raise HTTPException(status_code=404, detail="Relationship not found")
        
        # Verify user has access to the project
        project = await project_repo.get_by_id(relationship.project_id)
        if not project or project.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this relationship")
        
        # Recalculate strength
        new_strength = await discovery_service.calculate_relationship_strength(
            relationship_id, additional_factors
        )
        
        return {
            "relationship_id": relationship_id,
            "old_strength": relationship.strength,
            "new_strength": new_strength
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recalculating relationship strength: {e}")
        raise HTTPException(status_code=500, detail="Failed to recalculate relationship strength")


@router.get("/projects/{project_id}/relationships/statistics")
async def get_relationship_statistics(
    project_id: str,
    current_user: User = Depends(get_current_user),
    project_repo: ProjectRepository = Depends(get_project_repository),
    discovery_service: RelationshipDiscoveryService = Depends(get_relationship_discovery_service)
) -> Dict[str, Any]:
    """
    Get comprehensive relationship statistics for a project
    """
    try:
        # Verify project ownership
        project = await project_repo.get_by_id(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this project")
        
        # Get statistics
        stats = await discovery_service.get_relationship_statistics(project_id)
        
        return stats
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting relationship statistics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get relationship statistics")