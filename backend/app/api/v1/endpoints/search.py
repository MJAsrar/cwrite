"""
Search API endpoints for semantic search functionality
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
import logging

from app.core.security import get_current_user
from app.models.user import User
from app.services.search_service import SearchService
from app.services.embedding_service import EmbeddingService
from app.repositories.text_chunk_repository import TextChunkRepository
from app.repositories.entity_repository import EntityRepository
from app.repositories.file_repository import FileRepository
from app.repositories.search_log_repository import SearchLogRepository
from app.repositories.position_index_repository import PositionIndexRepository
from app.repositories.scene_repository import SceneRepository
from app.repositories.entity_mention_repository import EntityMentionRepository

logger = logging.getLogger(__name__)

router = APIRouter()


class SearchRequest(BaseModel):
    """Search request model"""
    query: str = Field(..., min_length=1, max_length=500, description="Search query text")
    project_ids: Optional[List[str]] = Field(None, description="Project IDs to limit search scope")
    entity_types: Optional[List[str]] = Field(None, description="Filter by entity types")
    file_ids: Optional[List[str]] = Field(None, description="Filter by specific files")
    limit: int = Field(20, ge=1, le=100, description="Maximum number of results")
    offset: int = Field(0, ge=0, description="Result offset for pagination")
    similarity_threshold: float = Field(0.1, ge=0.0, le=1.0, description="Minimum similarity score")
    search_type: str = Field("hybrid", description="Search type: semantic, hybrid, or keyword")


class SimilarityRequest(BaseModel):
    """Similarity calculation request model"""
    text1: str = Field(..., description="First text for similarity comparison")
    text2: str = Field(..., description="Second text for similarity comparison")
    limit: int = Field(20, ge=1, le=100, description="Maximum number of results")
    offset: int = Field(0, ge=0, description="Result offset for pagination")
    similarity_threshold: float = Field(0.1, ge=0.0, le=1.0, description="Minimum similarity score")
    search_type: str = Field("hybrid", description="Search type: semantic, hybrid, or keyword")


class SearchResultModel(BaseModel):
    """Enhanced search result model with Phase 1 position data"""
    chunk_id: str
    file_id: str
    project_id: str
    content: str
    similarity_score: float
    metadata_score: float
    relevance_score: float
    entity_matches: List[str]
    highlights: List[str]
    context: Dict[str, Any]
    # Phase 1 enhancements
    scene_number: Optional[int] = None
    scene_id: Optional[str] = None
    chapter_number: Optional[int] = None
    start_line: Optional[int] = None
    end_line: Optional[int] = None
    total_lines: Optional[int] = None
    position_data: Optional[Dict[str, Any]] = None


class SearchResponse(BaseModel):
    """Search response model"""
    results: List[SearchResultModel]
    total_count: int
    query_time_ms: int
    query: str
    suggestions: List[str] = []


class EmbeddingRequest(BaseModel):
    """Embedding generation request"""
    text: str = Field(..., min_length=1, max_length=10000, description="Text to generate embedding for")


class EmbeddingResponse(BaseModel):
    """Embedding generation response"""
    embedding: List[float]
    dimension: int
    model_name: str


class EmbeddingStatsResponse(BaseModel):
    """Embedding statistics response"""
    total_chunks_with_embeddings: int
    model_info: Dict[str, Any]
    cache_ttl_seconds: int


# Initialize services (will be dependency injected in production)
def get_search_service() -> SearchService:
    """Get search service instance"""
    text_chunk_repo = TextChunkRepository()
    entity_repo = EntityRepository()
    file_repo = FileRepository()
    search_log_repo = SearchLogRepository()
    embedding_service = EmbeddingService(text_chunk_repo)
    
    # Initialize cache service
    try:
        from app.services.search_cache_service import SearchCacheService
        cache_service = SearchCacheService()
    except Exception as e:
        logger.warning(f"Failed to initialize cache service: {e}")
        cache_service = None
    
    return SearchService(
        text_chunk_repo,
        entity_repo,
        file_repo,
        search_log_repo,
        embedding_service,
        cache_service
    )

def get_embedding_service() -> EmbeddingService:
    """Get embedding service instance"""
    text_chunk_repo = TextChunkRepository()
    return EmbeddingService(text_chunk_repo)


@router.post("/search", response_model=SearchResponse)
async def search(
    request: SearchRequest,
    current_user: User = Depends(get_current_user),
    search_service: SearchService = Depends(get_search_service)
):
    """
    Perform search across text chunks with multiple search modes
    
    This endpoint supports semantic, hybrid, and keyword search modes.
    It provides advanced filtering, result ranking, and autocomplete suggestions.
    """
    try:
        import time
        start_time = time.time()
        
        logger.info(f"Search request from user {current_user.id}: '{request.query}' (type: {request.search_type})")
        
        # Determine which project to search (use first project_id if multiple provided)
        project_id = request.project_ids[0] if request.project_ids else None
        if not project_id:
            raise HTTPException(status_code=400, detail="Project ID is required")
        
        # Perform search based on type
        if request.search_type == "semantic":
            results = await search_service.semantic_search(
                project_id=project_id,
                query=request.query,
                limit=request.limit,
                similarity_threshold=request.similarity_threshold,
                entity_types=request.entity_types,
                file_ids=request.file_ids
            )
        elif request.search_type == "hybrid":
            results = await search_service.hybrid_search(
                project_id=project_id,
                query=request.query,
                limit=request.limit,
                similarity_threshold=request.similarity_threshold,
                entity_types=request.entity_types,
                file_ids=request.file_ids
            )
        else:
            # Default to hybrid search
            results = await search_service.hybrid_search(
                project_id=project_id,
                query=request.query,
                limit=request.limit,
                similarity_threshold=request.similarity_threshold,
                entity_types=request.entity_types,
                file_ids=request.file_ids
            )
        
        # Apply offset for pagination
        paginated_results = results[request.offset:request.offset + request.limit]
        
        # Initialize Phase 1 repositories
        position_repo = PositionIndexRepository()
        scene_repo = SceneRepository()
        text_chunk_repo = TextChunkRepository()
        
        # Convert results to response format with Phase 1 enrichment
        search_results = []
        for result in paginated_results:
            # Get the text chunk to find its position
            chunk = await text_chunk_repo.get_by_id(result.chunk_id)
            
            # Phase 1 enrichment
            scene_number = None
            scene_id = None
            chapter_number = None
            start_line = None
            end_line = None
            total_lines = None
            position_data = {}
            
            if chunk and chunk.start_position is not None:
                # Find the scene at this position
                scene = await scene_repo.get_scene_at_position(result.file_id, chunk.start_position)
                if scene:
                    scene_number = scene.scene_number
                    scene_id = scene.id
                    chapter_number = scene.chapter_number
                    position_data['scene_break_type'] = scene.break_type
                    position_data['scene_word_count'] = scene.word_count
                    position_data['scene_dialogue_percentage'] = scene.dialogue_percentage
                
                # Find lines at start and end of chunk
                start_line_idx = await position_repo.get_at_position(result.file_id, chunk.start_position)
                if start_line_idx:
                    start_line = start_line_idx.line_number
                    position_data['paragraph_number'] = start_line_idx.paragraph_number
                
                if chunk.end_position:
                    end_line_idx = await position_repo.get_at_position(result.file_id, chunk.end_position)
                    if end_line_idx:
                        end_line = end_line_idx.line_number
                        total_lines = end_line - start_line + 1 if start_line else None
            
            search_results.append(SearchResultModel(
                chunk_id=result.chunk_id,
                file_id=result.file_id,
                project_id=result.project_id,
                content=result.content,
                similarity_score=result.similarity_score,
                metadata_score=result.metadata_score,
                relevance_score=result.relevance_score,
                entity_matches=result.entity_matches,
                highlights=result.highlights,
                context=result.context,
                # Phase 1 data
                scene_number=scene_number,
                scene_id=scene_id,
                chapter_number=chapter_number,
                start_line=start_line,
                end_line=end_line,
                total_lines=total_lines,
                position_data=position_data if position_data else None
            ))
        
        # Get autocomplete suggestions
        suggestions = await search_service.get_autocomplete_suggestions(
            project_id, request.query, 5
        )
        
        query_time = int((time.time() - start_time) * 1000)
        
        logger.info(f"Search completed in {query_time}ms, found {len(results)} total results")
        
        return SearchResponse(
            results=search_results,
            total_count=len(results),
            query_time_ms=query_time,
            query=request.query,
            suggestions=suggestions
        )
        
    except Exception as e:
        logger.error(f"Search failed for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.post("/embeddings/generate", response_model=EmbeddingResponse)
async def generate_embedding(
    request: EmbeddingRequest,
    current_user: User = Depends(get_current_user),
    embedding_service: EmbeddingService = Depends(get_embedding_service)
):
    """
    Generate embedding for a given text
    
    This endpoint generates a vector embedding for the provided text using
    the SentenceTransformers model. Useful for testing and debugging.
    """
    try:
        logger.info(f"Embedding generation request from user {current_user.id}")
        
        # Generate embedding
        embedding = await embedding_service.generate_embedding(request.text)
        
        return EmbeddingResponse(
            embedding=embedding,
            dimension=len(embedding),
            model_name=embedding_service._model_name
        )
        
    except Exception as e:
        logger.error(f"Embedding generation failed for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Embedding generation failed: {str(e)}")


@router.get("/embeddings/stats", response_model=EmbeddingStatsResponse)
async def get_embedding_stats(
    current_user: User = Depends(get_current_user),
    embedding_service: EmbeddingService = Depends(get_embedding_service)
):
    """
    Get embedding system statistics
    
    Returns information about the embedding system including total chunks,
    model information, and cache settings.
    """
    try:
        logger.info(f"Embedding stats request from user {current_user.id}")
        
        stats = await embedding_service.get_embedding_stats()
        
        return EmbeddingStatsResponse(**stats)
        
    except Exception as e:
        logger.error(f"Failed to get embedding stats for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")


@router.post("/embeddings/similarity")
async def calculate_similarity(
    request: SimilarityRequest,
    current_user: User = Depends(get_current_user),
    embedding_service: EmbeddingService = Depends(get_embedding_service)
):
    """
    Calculate similarity between two texts
    
    This endpoint generates embeddings for both texts and calculates
    their cosine similarity score.
    """
    try:
        logger.info(f"Similarity calculation request from user {current_user.id}")
        
        # Generate embeddings for both texts
        embedding1 = await embedding_service.generate_embedding(request.text1)
        embedding2 = await embedding_service.generate_embedding(request.text2)
        
        # Calculate similarity
        similarity = embedding_service.calculate_similarity(embedding1, embedding2)
        
        return {
            "text1": request.text1,
            "text2": request.text2,
            "similarity_score": similarity,
            "model_name": embedding_service._model_name
        }
        
    except Exception as e:
        logger.error(f"Similarity calculation failed for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Similarity calculation failed: {str(e)}")


@router.get("/autocomplete/{project_id}")
async def get_autocomplete_suggestions(
    project_id: str,
    q: str = Query(..., description="Partial query for autocomplete"),
    limit: int = Query(10, ge=1, le=20, description="Maximum number of suggestions"),
    current_user: User = Depends(get_current_user),
    search_service: SearchService = Depends(get_search_service)
):
    """
    Get autocomplete suggestions for search queries
    
    This endpoint provides real-time autocomplete suggestions based on
    entity names and previous search queries.
    """
    try:
        logger.info(f"Autocomplete request from user {current_user.id}: '{q}'")
        
        suggestions = await search_service.get_autocomplete_suggestions(
            project_id, q, limit
        )
        
        return {
            "query": q,
            "suggestions": suggestions,
            "project_id": project_id
        }
        
    except Exception as e:
        logger.error(f"Autocomplete failed for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Autocomplete failed: {str(e)}")


@router.get("/similar/{chunk_id}")
async def find_similar_content(
    chunk_id: str,
    limit: int = Query(10, ge=1, le=50, description="Maximum number of similar chunks"),
    similarity_threshold: float = Query(0.3, ge=0.0, le=1.0, description="Minimum similarity score"),
    current_user: User = Depends(get_current_user),
    search_service: SearchService = Depends(get_search_service)
):
    """
    Find content similar to a specific chunk
    
    This endpoint finds text chunks that are semantically similar to
    the specified reference chunk.
    """
    try:
        logger.info(f"Similar content request from user {current_user.id} for chunk {chunk_id}")
        
        similar_results = await search_service.find_similar_content(
            chunk_id, limit, similarity_threshold
        )
        
        # Initialize Phase 1 repositories for enrichment
        position_repo = PositionIndexRepository()
        scene_repo = SceneRepository()
        text_chunk_repo = TextChunkRepository()
        
        # Convert to response format with Phase 1 enrichment
        similar_chunks = []
        for result in similar_results:
            # Get the text chunk to find its position
            chunk = await text_chunk_repo.get_by_id(result.chunk_id)
            
            # Phase 1 enrichment
            scene_number = None
            scene_id = None
            chapter_number = None
            start_line = None
            end_line = None
            total_lines = None
            position_data = {}
            
            if chunk and chunk.start_position is not None:
                # Find the scene at this position
                scene = await scene_repo.get_scene_at_position(result.file_id, chunk.start_position)
                if scene:
                    scene_number = scene.scene_number
                    scene_id = scene.id
                    chapter_number = scene.chapter_number
                    position_data['scene_break_type'] = scene.break_type
                
                # Find lines
                start_line_idx = await position_repo.get_at_position(result.file_id, chunk.start_position)
                if start_line_idx:
                    start_line = start_line_idx.line_number
                
                if chunk.end_position:
                    end_line_idx = await position_repo.get_at_position(result.file_id, chunk.end_position)
                    if end_line_idx:
                        end_line = end_line_idx.line_number
                        total_lines = end_line - start_line + 1 if start_line else None
            
            similar_chunks.append(SearchResultModel(
                chunk_id=result.chunk_id,
                file_id=result.file_id,
                project_id=result.project_id,
                content=result.content,
                similarity_score=result.similarity_score,
                metadata_score=result.metadata_score,
                relevance_score=result.relevance_score,
                entity_matches=result.entity_matches,
                highlights=result.highlights,
                context=result.context,
                # Phase 1 data
                scene_number=scene_number,
                scene_id=scene_id,
                chapter_number=chapter_number,
                start_line=start_line,
                end_line=end_line,
                total_lines=total_lines,
                position_data=position_data if position_data else None
            ))
        
        return {
            "reference_chunk_id": chunk_id,
            "similar_chunks": similar_chunks,
            "total_found": len(similar_chunks)
        }
        
    except Exception as e:
        logger.error(f"Similar content search failed for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Similar content search failed: {str(e)}")


@router.get("/analytics/{project_id}")
async def get_search_analytics(
    project_id: str,
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    search_service: SearchService = Depends(get_search_service)
):
    """
    Get search analytics for a project
    
    This endpoint provides search statistics, popular queries,
    and performance metrics for the specified project.
    """
    try:
        logger.info(f"Search analytics request from user {current_user.id} for project {project_id}")
        
        analytics = await search_service.get_search_analytics(project_id, days)
        
        return analytics
        
    except Exception as e:
        logger.error(f"Search analytics failed for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Search analytics failed: {str(e)}")


@router.get("/analytics/{project_id}/export")
async def export_search_analytics(
    project_id: str,
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    format: str = Query("csv", description="Export format: csv or json"),
    current_user: User = Depends(get_current_user),
    search_service: SearchService = Depends(get_search_service)
):
    """
    Export search analytics data
    
    This endpoint exports search analytics data in CSV or JSON format
    for external analysis and reporting.
    """
    try:
        from fastapi.responses import StreamingResponse
        import io
        import csv
        import json
        
        logger.info(f"Analytics export request from user {current_user.id} for project {project_id}")
        
        analytics = await search_service.get_search_analytics(project_id, days)
        
        if format.lower() == "csv":
            # Create CSV content
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Write headers and data for popular queries
            writer.writerow(["Query", "Count", "Avg Response Time (ms)", "Last Used"])
            for query in analytics.get("popular_queries", []):
                writer.writerow([
                    query["query"],
                    query["count"],
                    query["avg_response_time"],
                    query.get("last_used", "")
                ])
            
            # Add empty row and trends data
            writer.writerow([])
            writer.writerow(["Date", "Searches", "Avg Response Time (ms)"])
            for trend in analytics.get("search_trends", []):
                writer.writerow([
                    trend["date"],
                    trend["searches"],
                    trend["avg_response_time"]
                ])
            
            content = output.getvalue()
            output.close()
            
            return StreamingResponse(
                io.BytesIO(content.encode()),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=search-analytics-{project_id}.csv"}
            )
        
        else:  # JSON format
            content = json.dumps(analytics, indent=2, default=str)
            return StreamingResponse(
                io.BytesIO(content.encode()),
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename=search-analytics-{project_id}.json"}
            )
        
    except Exception as e:
        logger.error(f"Analytics export failed for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.get("/performance/{project_id}")
async def get_search_performance(
    project_id: str,
    current_user: User = Depends(get_current_user),
    search_service: SearchService = Depends(get_search_service)
):
    """
    Get search performance metrics for a project
    
    This endpoint provides detailed performance metrics including
    response times, cache hit rates, and optimization statistics.
    """
    try:
        logger.info(f"Search performance request from user {current_user.id} for project {project_id}")
        
        performance_metrics = await search_service.get_search_performance_metrics(project_id)
        
        return {
            "project_id": project_id,
            "performance_metrics": performance_metrics,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Search performance request failed for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Performance metrics failed: {str(e)}")


@router.delete("/cache/{project_id}")
async def invalidate_search_cache(
    project_id: str,
    pattern: Optional[str] = Query(None, description="Optional pattern to match specific cache keys"),
    current_user: User = Depends(get_current_user),
    search_service: SearchService = Depends(get_search_service)
):
    """
    Invalidate search cache for a project
    
    This endpoint clears cached search results and suggestions
    for the specified project, optionally matching a pattern.
    """
    try:
        logger.info(f"Cache invalidation request from user {current_user.id} for project {project_id}")
        
        if not search_service.enable_caching:
            return {
                "message": "Caching is not enabled",
                "invalidated_keys": 0
            }
        
        invalidated_count = await search_service.cache_service.invalidate_cache(project_id, pattern)
        
        return {
            "project_id": project_id,
            "pattern": pattern,
            "invalidated_keys": invalidated_count,
            "status": "completed"
        }
        
    except Exception as e:
        logger.error(f"Cache invalidation failed for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Cache invalidation failed: {str(e)}")


@router.delete("/embeddings/cleanup/{project_id}")
async def cleanup_project_embeddings(
    project_id: str,
    current_user: User = Depends(get_current_user),
    embedding_service: EmbeddingService = Depends(get_embedding_service)
):
    """
    Clean up embeddings for a specific project
    
    This endpoint removes all text chunks and embeddings associated
    with the specified project.
    """
    try:
        logger.info(f"Embedding cleanup request from user {current_user.id} for project {project_id}")
        
        # TODO: Add project ownership validation
        # Ensure user owns the project before allowing cleanup
        
        deleted_count = await embedding_service.cleanup_embeddings(project_id)
        
        return {
            "project_id": project_id,
            "deleted_chunks": deleted_count,
            "status": "completed"
        }
        
    except Exception as e:
        logger.error(f"Embedding cleanup failed for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")