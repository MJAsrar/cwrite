"""
Search Service

This service implements semantic search functionality with hybrid search capabilities,
combining vector similarity search with metadata filtering and result ranking.
"""

import logging
from typing import List, Dict, Optional, Any, Tuple
import asyncio
from datetime import datetime
import hashlib
import json

from ..models.text_chunk import TextChunk
from ..models.entity import Entity
from ..models.file import ProjectFile
from ..repositories.text_chunk_repository import TextChunkRepository
from ..repositories.entity_repository import EntityRepository
from ..repositories.file_repository import FileRepository
from ..repositories.search_log_repository import SearchLogRepository
from ..services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)


class SearchResult:
    """Search result with relevance scoring"""
    
    def __init__(
        self,
        chunk_id: str,
        file_id: str,
        project_id: str,
        content: str,
        similarity_score: float,
        metadata_score: float = 0.0,
        entity_matches: List[str] = None,
        highlights: List[str] = None,
        context: Dict[str, Any] = None
    ):
        self.chunk_id = chunk_id
        self.file_id = file_id
        self.project_id = project_id
        self.content = content
        self.similarity_score = similarity_score
        self.metadata_score = metadata_score
        self.entity_matches = entity_matches or []
        self.highlights = highlights or []
        self.context = context or {}
        
        # Calculate combined relevance score
        self.relevance_score = self._calculate_relevance_score()
    
    def _calculate_relevance_score(self) -> float:
        """Calculate combined relevance score from multiple factors"""
        # Base semantic similarity (70% weight)
        semantic_weight = 0.7
        semantic_component = self.similarity_score * semantic_weight
        
        # Metadata relevance (20% weight)
        metadata_weight = 0.2
        metadata_component = self.metadata_score * metadata_weight
        
        # Entity match bonus (10% weight)
        entity_weight = 0.1
        entity_bonus = min(len(self.entity_matches) * 0.1, 1.0)
        entity_component = entity_bonus * entity_weight
        
        return semantic_component + metadata_component + entity_component
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response"""
        return {
            "chunk_id": self.chunk_id,
            "file_id": self.file_id,
            "project_id": self.project_id,
            "content": self.content,
            "similarity_score": self.similarity_score,
            "metadata_score": self.metadata_score,
            "relevance_score": self.relevance_score,
            "entity_matches": self.entity_matches,
            "highlights": self.highlights,
            "context": self.context
        }


class SearchService:
    """Service for semantic and hybrid search functionality"""
    
    def __init__(
        self,
        text_chunk_repository: TextChunkRepository,
        entity_repository: EntityRepository,
        file_repository: FileRepository,
        search_log_repository: SearchLogRepository,
        embedding_service: EmbeddingService,
        cache_service=None,
        chroma_service=None
    ):
        self.text_chunk_repository = text_chunk_repository
        self.entity_repository = entity_repository
        self.file_repository = file_repository
        self.search_log_repository = search_log_repository
        self.embedding_service = embedding_service
        self.cache_service = cache_service
        self.chroma_service = chroma_service
        
        # Initialize ChromaDB service if not provided
        if self.chroma_service is None and hasattr(embedding_service, 'chroma_service'):
            self.chroma_service = embedding_service.chroma_service
            logger.info("Using ChromaDB service from embedding service")
        
        # Search configuration
        self.default_similarity_threshold = 0.1
        self.max_results = 100
        self.highlight_length = 150
        self.context_window = 50
        self.enable_caching = cache_service is not None
    
    async def generate_query_embedding(self, query: str) -> List[float]:
        """
        Generate embedding for search query
        
        Args:
            query: Search query text
            
        Returns:
            Query embedding vector
        """
        try:
            # Preprocess query
            processed_query = self._preprocess_query(query)
            
            # Generate embedding using embedding service
            embedding = await self.embedding_service.generate_single_embedding(processed_query)
            
            logger.info(f"Generated query embedding for: '{query[:50]}...'")
            return embedding
            
        except Exception as e:
            logger.error(f"Error generating query embedding: {e}")
            return []
    
    def _preprocess_query(self, query: str) -> str:
        """Preprocess search query for better results"""
        if not query:
            return ""
        
        # Clean and normalize
        query = query.strip()
        
        # Remove excessive whitespace
        query = " ".join(query.split())
        
        return query
    
    async def semantic_search(
        self,
        project_id: str,
        query: str,
        limit: int = 20,
        similarity_threshold: float = None,
        entity_types: List[str] = None,
        file_ids: List[str] = None
    ) -> List[SearchResult]:
        """
        Perform semantic search using vector similarity
        
        Args:
            project_id: Project to search in
            query: Search query text
            limit: Maximum number of results
            similarity_threshold: Minimum similarity score
            entity_types: Filter by entity types
            file_ids: Filter by specific files
            
        Returns:
            List of search results
        """
        try:
            start_time = datetime.utcnow()
            
            # Optimize query
            optimized_query = await self._optimize_query(query)
            
            # Check cache first
            if self.enable_caching:
                filters = {
                    "similarity_threshold": similarity_threshold,
                    "entity_types": entity_types,
                    "file_ids": file_ids,
                    "limit": limit
                }
                cached_results = await self.cache_service.get_cached_search_results(
                    project_id, optimized_query, filters
                )
                if cached_results:
                    logger.info(f"Returning {len(cached_results)} cached results for query '{query[:50]}...'")
                    return cached_results[:limit]
            
            # Generate query embedding
            query_embedding = await self.generate_query_embedding(optimized_query)
            if not query_embedding:
                return []
            
            # Set similarity threshold
            threshold = similarity_threshold or self.default_similarity_threshold
            
            # Perform vector search using ChromaDB (if available) or MongoDB Atlas
            if self.chroma_service:
                # Use ChromaDB for local vector search
                vector_results = await self.text_chunk_repository.vector_search_chroma(
                    project_id, query_embedding, limit * 2, self.chroma_service
                )
                logger.info(f"Using ChromaDB for vector search, got {len(vector_results)} results")
            else:
                # Fallback to MongoDB Atlas vector search (requires Atlas)
                vector_results = await self.text_chunk_repository.vector_search(
                    project_id, query_embedding, limit * 2  # Get more candidates for filtering
                )
                logger.info(f"Using MongoDB Atlas for vector search, got {len(vector_results)} results")
            
            # Convert to SearchResult objects and apply filters
            search_results = []
            for result in vector_results:
                similarity_score = result.get('score', 0.0)
                
                # Apply similarity threshold
                if similarity_score < threshold:
                    continue
                
                # Apply file filter if specified
                if file_ids and str(result.get('file_id')) not in file_ids:
                    continue
                
                # Create search result
                search_result = SearchResult(
                    chunk_id=str(result['_id']),
                    file_id=str(result['file_id']),
                    project_id=str(result['project_id']),
                    content=result['content'],
                    similarity_score=similarity_score,
                    highlights=self._generate_highlights(query, result['content'])
                )
                
                search_results.append(search_result)
            
            # Apply entity type filtering if specified
            if entity_types:
                search_results = await self._filter_by_entity_types(search_results, entity_types)
            
            # Sort by relevance score and limit results
            search_results.sort(key=lambda x: x.relevance_score, reverse=True)
            search_results = search_results[:limit]
            
            # Cache results
            if self.enable_caching and search_results:
                filters = {
                    "similarity_threshold": similarity_threshold,
                    "entity_types": entity_types,
                    "file_ids": file_ids,
                    "limit": limit
                }
                await self.cache_service.cache_search_results(
                    project_id, optimized_query, search_results, filters
                )
            
            # Track popular queries
            if self.enable_caching:
                await self.cache_service.track_popular_queries(
                    project_id, query, len(search_results)
                )
            
            # Log search
            query_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            await self._log_search(project_id, query, len(search_results), query_time)
            
            logger.info(f"Semantic search completed: {len(search_results)} results in {query_time:.2f}ms")
            return search_results
            
        except Exception as e:
            logger.error(f"Error performing semantic search: {e}")
            return []
    
    async def hybrid_search(
        self,
        project_id: str,
        query: str,
        limit: int = 20,
        similarity_threshold: float = None,
        entity_types: List[str] = None,
        file_ids: List[str] = None,
        metadata_filters: Dict[str, Any] = None
    ) -> List[SearchResult]:
        """
        Perform hybrid search combining semantic and metadata search
        
        Args:
            project_id: Project to search in
            query: Search query text
            limit: Maximum number of results
            similarity_threshold: Minimum similarity score
            entity_types: Filter by entity types
            file_ids: Filter by specific files
            metadata_filters: Additional metadata filters
            
        Returns:
            List of search results with combined scoring
        """
        try:
            start_time = datetime.utcnow()
            
            # Perform semantic search
            semantic_results = await self.semantic_search(
                project_id, query, limit * 2, similarity_threshold, entity_types, file_ids
            )
            
            # Perform keyword search for metadata scoring
            keyword_results = await self._keyword_search(
                project_id, query, limit * 2, file_ids
            )
            
            # Combine and score results
            combined_results = self._combine_search_results(
                semantic_results, keyword_results, metadata_filters
            )
            
            # Sort by combined relevance score
            combined_results.sort(key=lambda x: x.relevance_score, reverse=True)
            combined_results = combined_results[:limit]
            
            # Log search
            query_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            await self._log_search(project_id, query, len(combined_results), query_time, search_type="hybrid")
            
            logger.info(f"Hybrid search completed: {len(combined_results)} results in {query_time:.2f}ms")
            return combined_results
            
        except Exception as e:
            logger.error(f"Error performing hybrid search: {e}")
            return []
    
    async def _keyword_search(
        self,
        project_id: str,
        query: str,
        limit: int,
        file_ids: List[str] = None
    ) -> List[Dict[str, Any]]:
        """Perform keyword-based search for metadata scoring"""
        try:
            # Build text search query
            search_filter = {
                "project_id": {"$oid": project_id},
                "$text": {"$search": query}
            }
            
            # Add file filter if specified
            if file_ids:
                search_filter["file_id"] = {"$in": [{"$oid": fid} for fid in file_ids]}
            
            # Perform text search
            results = await self.text_chunk_repository.collection.find(
                search_filter,
                {"score": {"$meta": "textScore"}}
            ).sort([("score", {"$meta": "textScore"})]).limit(limit).to_list(length=limit)
            
            return results
            
        except Exception as e:
            logger.error(f"Error performing keyword search: {e}")
            return []
    
    def _combine_search_results(
        self,
        semantic_results: List[SearchResult],
        keyword_results: List[Dict[str, Any]],
        metadata_filters: Dict[str, Any] = None
    ) -> List[SearchResult]:
        """Combine semantic and keyword search results"""
        # Create lookup for keyword scores
        keyword_scores = {}
        for result in keyword_results:
            chunk_id = str(result['_id'])
            keyword_scores[chunk_id] = result.get('score', 0.0)
        
        # Update semantic results with metadata scores
        combined_results = []
        for result in semantic_results:
            # Add keyword/metadata score
            metadata_score = keyword_scores.get(result.chunk_id, 0.0)
            result.metadata_score = metadata_score
            
            # Recalculate relevance score
            result.relevance_score = result._calculate_relevance_score()
            
            # Apply metadata filters if specified
            if metadata_filters and not self._matches_metadata_filters(result, metadata_filters):
                continue
            
            combined_results.append(result)
        
        # Add keyword-only results that weren't in semantic results
        semantic_chunk_ids = {r.chunk_id for r in semantic_results}
        for result in keyword_results:
            chunk_id = str(result['_id'])
            if chunk_id not in semantic_chunk_ids:
                search_result = SearchResult(
                    chunk_id=chunk_id,
                    file_id=str(result['file_id']),
                    project_id=str(result['project_id']),
                    content=result['content'],
                    similarity_score=0.0,
                    metadata_score=result.get('score', 0.0)
                )
                combined_results.append(search_result)
        
        return combined_results
    
    def _matches_metadata_filters(self, result: SearchResult, filters: Dict[str, Any]) -> bool:
        """Check if result matches metadata filters"""
        # Implementation depends on specific metadata filter requirements
        # This is a placeholder for extensible metadata filtering
        return True
    
    async def _filter_by_entity_types(
        self,
        results: List[SearchResult],
        entity_types: List[str]
    ) -> List[SearchResult]:
        """Filter results by entity types mentioned in chunks"""
        try:
            filtered_results = []
            
            for result in results:
                # Get chunk to check entity mentions
                chunk = await self.text_chunk_repository.get_by_id(result.chunk_id)
                if not chunk or not chunk.entities_mentioned:
                    continue
                
                # Get entities mentioned in chunk
                entities = await self.entity_repository.get_many_by_ids(chunk.entities_mentioned)
                
                # Check if any entity matches the requested types
                entity_matches = []
                for entity in entities:
                    if entity.type in entity_types:
                        entity_matches.append(entity.name)
                
                if entity_matches:
                    result.entity_matches = entity_matches
                    filtered_results.append(result)
            
            return filtered_results
            
        except Exception as e:
            logger.error(f"Error filtering by entity types: {e}")
            return results
    
    def _generate_highlights(self, query: str, content: str) -> List[str]:
        """Generate highlighted text snippets"""
        try:
            query_terms = query.lower().split()
            content_lower = content.lower()
            
            highlights = []
            
            # Find positions of query terms
            for term in query_terms:
                if term in content_lower:
                    start_pos = content_lower.find(term)
                    
                    # Extract context around the term
                    context_start = max(0, start_pos - self.context_window)
                    context_end = min(len(content), start_pos + len(term) + self.context_window)
                    
                    highlight = content[context_start:context_end]
                    
                    # Add ellipsis if truncated
                    if context_start > 0:
                        highlight = "..." + highlight
                    if context_end < len(content):
                        highlight = highlight + "..."
                    
                    highlights.append(highlight)
            
            # Limit number of highlights
            return highlights[:3]
            
        except Exception as e:
            logger.error(f"Error generating highlights: {e}")
            return []
    
    async def get_autocomplete_suggestions(
        self,
        project_id: str,
        partial_query: str,
        limit: int = 10
    ) -> List[str]:
        """
        Get autocomplete suggestions for search queries
        
        Args:
            project_id: Project to get suggestions for
            partial_query: Partial query text
            limit: Maximum number of suggestions
            
        Returns:
            List of suggested query completions
        """
        try:
            # Check cache first
            if self.enable_caching:
                cached_suggestions = await self.cache_service.get_cached_query_suggestions(
                    project_id, partial_query
                )
                if cached_suggestions:
                    return cached_suggestions[:limit]
            
            suggestions = []
            
            # Get entity names that match partial query
            entity_suggestions = await self._get_entity_suggestions(project_id, partial_query, limit // 2)
            suggestions.extend(entity_suggestions)
            
            # Get common phrases from search logs
            phrase_suggestions = await self._get_phrase_suggestions(project_id, partial_query, limit // 2)
            suggestions.extend(phrase_suggestions)
            
            # Remove duplicates and limit
            unique_suggestions = list(dict.fromkeys(suggestions))
            final_suggestions = unique_suggestions[:limit]
            
            # Cache suggestions
            if self.enable_caching and final_suggestions:
                await self.cache_service.cache_query_suggestions(
                    project_id, partial_query, final_suggestions
                )
            
            return final_suggestions
            
        except Exception as e:
            logger.error(f"Error getting autocomplete suggestions: {e}")
            return []
    
    async def _get_entity_suggestions(
        self,
        project_id: str,
        partial_query: str,
        limit: int
    ) -> List[str]:
        """Get entity name suggestions"""
        try:
            # Search for entities with names matching partial query
            entities = await self.entity_repository.search_by_name(project_id, partial_query, limit)
            return [entity.name for entity in entities]
            
        except Exception as e:
            logger.error(f"Error getting entity suggestions: {e}")
            return []
    
    async def _get_phrase_suggestions(
        self,
        project_id: str,
        partial_query: str,
        limit: int
    ) -> List[str]:
        """Get phrase suggestions from search logs"""
        try:
            # Get recent search queries that start with partial query
            recent_queries = await self.search_log_repository.get_recent_queries_starting_with(
                project_id, partial_query, limit
            )
            return [log.query for log in recent_queries]
            
        except Exception as e:
            logger.error(f"Error getting phrase suggestions: {e}")
            return []
    
    async def _log_search(
        self,
        project_id: str,
        query: str,
        result_count: int,
        response_time_ms: float,
        search_type: str = "semantic",
        user_id: str = None
    ):
        """Log search query for analytics"""
        try:
            # Generate query hash for caching
            query_hash = hashlib.md5(f"{project_id}:{query}".encode()).hexdigest()
            
            # Create search log entry
            from ..models.search_log import SearchLog
            
            search_log = SearchLog(
                user_id=user_id,
                project_id=project_id,
                query=query,
                query_hash=query_hash,
                result_count=result_count,
                response_time_ms=response_time_ms,
                search_type=search_type,
                created_at=datetime.utcnow()
            )
            
            await self.search_log_repository.create(search_log)
            
        except Exception as e:
            logger.error(f"Error logging search: {e}")
    
    async def get_search_analytics(
        self,
        project_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get comprehensive search analytics for a project
        
        Args:
            project_id: Project ID
            days: Number of days to analyze
            
        Returns:
            Dictionary with comprehensive search analytics
        """
        try:
            # Get basic search statistics
            stats = await self.search_log_repository.get_search_stats(project_id, days)
            
            # Get popular queries with enhanced metrics
            popular_queries = await self.search_log_repository.get_popular_queries(project_id, days, 15)
            
            # Get search trends over time
            search_trends = await self.search_log_repository.get_search_trends(project_id, days)
            
            # Get entity type distribution from searches
            entity_distribution = await self._get_entity_search_distribution(project_id, days)
            
            # Get performance metrics
            performance_metrics = await self.search_log_repository.get_performance_metrics(project_id, days)
            
            # Get slow queries for optimization
            slow_queries = await self.search_log_repository.get_slow_queries(project_id, days, 5)
            
            # Calculate cache hit rate if caching is enabled
            cache_hit_rate = 0.0
            if self.enable_caching and self.cache_service:
                cache_stats = await self.cache_service.get_cache_stats(project_id)
                cache_hit_rate = cache_stats.get("hit_rate", 0.0)
            
            # Calculate average result count
            avg_result_count = stats.get("avg_results_per_query", 0)
            
            return {
                "totalSearches": stats.get("total_searches", 0),
                "uniqueQueries": stats.get("unique_queries", 0),
                "averageResponseTime": stats.get("avg_response_time_ms", 0),
                "popularQueries": [
                    {
                        "query": q["query"],
                        "count": q["count"],
                        "avgResponseTime": q.get("avg_response_time", 0),
                        "lastUsed": q.get("last_used", "")
                    }
                    for q in popular_queries
                ],
                "searchTrends": [
                    {
                        "date": trend["date"],
                        "searches": trend["count"],
                        "avgResponseTime": trend.get("avg_response_time", 0)
                    }
                    for trend in search_trends
                ],
                "entityTypeDistribution": entity_distribution,
                "performanceMetrics": {
                    "cacheHitRate": cache_hit_rate,
                    "averageResultCount": avg_result_count,
                    "slowQueries": [
                        {
                            "query": q["query"],
                            "responseTime": q["response_time"],
                            "timestamp": q.get("timestamp", "")
                        }
                        for q in slow_queries
                    ]
                },
                "periodDays": days,
                "generatedAt": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting search analytics: {e}")
            return {
                "totalSearches": 0,
                "uniqueQueries": 0,
                "averageResponseTime": 0,
                "popularQueries": [],
                "searchTrends": [],
                "entityTypeDistribution": [],
                "performanceMetrics": {
                    "cacheHitRate": 0.0,
                    "averageResultCount": 0,
                    "slowQueries": []
                },
                "periodDays": days,
                "generatedAt": datetime.utcnow().isoformat()
            }
    
    async def _get_entity_search_distribution(self, project_id: str, days: int) -> List[Dict[str, Any]]:
        """Get distribution of searches by entity type"""
        try:
            # Get entity search statistics from search logs
            entity_stats = await self.search_log_repository.get_entity_search_stats(project_id, days)
            
            total_searches = sum(stat["count"] for stat in entity_stats)
            
            return [
                {
                    "type": stat["entity_type"],
                    "count": stat["count"],
                    "percentage": round((stat["count"] / total_searches * 100), 1) if total_searches > 0 else 0
                }
                for stat in entity_stats
            ]
            
        except Exception as e:
            logger.error(f"Error getting entity search distribution: {e}")
            return [
                {"type": "character", "count": 0, "percentage": 0},
                {"type": "location", "count": 0, "percentage": 0},
                {"type": "theme", "count": 0, "percentage": 0},
                {"type": "document", "count": 0, "percentage": 0}
            ]
    
    async def _optimize_query(self, query: str) -> str:
        """Optimize search query for better performance"""
        if self.enable_caching:
            return await self.cache_service.optimize_query(query)
        else:
            # Basic optimization without cache service
            return query.strip().lower()
    
    async def get_search_performance_metrics(self, project_id: str) -> Dict[str, Any]:
        """Get search performance metrics with caching"""
        try:
            # Check cache first
            if self.enable_caching:
                cached_metrics = await self.cache_service.get_cached_performance_metrics(project_id)
                if cached_metrics:
                    return cached_metrics
            
            # Get fresh metrics
            metrics = await self.search_log_repository.get_performance_metrics(project_id, 30)
            
            # Add cache statistics if available
            if self.enable_caching:
                cache_stats = await self.cache_service.get_cache_statistics(project_id)
                metrics.update(cache_stats)
                
                # Cache the metrics
                await self.cache_service.cache_performance_metrics(project_id, metrics)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error getting search performance metrics: {e}")
            return {}

    async def find_similar_content(
        self,
        chunk_id: str,
        limit: int = 10,
        similarity_threshold: float = 0.3
    ) -> List[SearchResult]:
        """
        Find content similar to a specific chunk
        
        Args:
            chunk_id: Reference chunk ID
            limit: Maximum number of results
            similarity_threshold: Minimum similarity score
            
        Returns:
            List of similar content
        """
        try:
            # Get reference chunk
            reference_chunk = await self.text_chunk_repository.get_by_id(chunk_id)
            if not reference_chunk or not reference_chunk.embedding_vector:
                return []
            
            # Perform vector search using reference embedding
            if self.chroma_service:
                # Use ChromaDB for local vector search
                vector_results = await self.text_chunk_repository.vector_search_chroma(
                    reference_chunk.project_id,
                    reference_chunk.embedding_vector,
                    limit + 1,  # +1 to account for the reference chunk itself
                    self.chroma_service
                )
            else:
                # Fallback to MongoDB Atlas vector search
                vector_results = await self.text_chunk_repository.vector_search(
                    reference_chunk.project_id,
                    reference_chunk.embedding_vector,
                    limit + 1  # +1 to account for the reference chunk itself
                )
            
            # Convert to SearchResult objects and filter
            similar_results = []
            for result in vector_results:
                # Skip the reference chunk itself
                if str(result['_id']) == chunk_id:
                    continue
                
                similarity_score = result.get('score', 0.0)
                if similarity_score < similarity_threshold:
                    continue
                
                search_result = SearchResult(
                    chunk_id=str(result['_id']),
                    file_id=str(result['file_id']),
                    project_id=str(result['project_id']),
                    content=result['content'],
                    similarity_score=similarity_score
                )
                
                similar_results.append(search_result)
            
            # Sort by similarity and limit
            similar_results.sort(key=lambda x: x.similarity_score, reverse=True)
            return similar_results[:limit]
            
        except Exception as e:
            logger.error(f"Error finding similar content: {e}")
            return []