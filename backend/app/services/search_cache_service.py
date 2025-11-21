"""
Search Cache Service

This service implements Redis-based caching for search results,
query optimization, and performance monitoring.
"""

import logging
import json
import hashlib
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
import asyncio

from ..core.redis import get_redis_client
from ..services.search_service import SearchResult

logger = logging.getLogger(__name__)


class SearchCacheService:
    """Service for caching search results and optimizing queries"""
    
    def __init__(self):
        self.redis_client = None
        self._cache_ttl = 3600  # 1 hour default TTL
        self._popular_queries_ttl = 86400  # 24 hours for popular queries
        self._performance_metrics_ttl = 300  # 5 minutes for performance metrics
        
        # Cache key prefixes
        self.SEARCH_RESULTS_PREFIX = "search:results:"
        self.QUERY_SUGGESTIONS_PREFIX = "search:suggestions:"
        self.POPULAR_QUERIES_PREFIX = "search:popular:"
        self.PERFORMANCE_METRICS_PREFIX = "search:performance:"
        self.QUERY_ANALYTICS_PREFIX = "search:analytics:"
    
    async def _get_redis(self):
        """Get Redis client instance"""
        if not self.redis_client:
            self.redis_client = await get_redis_client()
        return self.redis_client
    
    def _generate_cache_key(self, prefix: str, *args) -> str:
        """Generate cache key from prefix and arguments"""
        key_data = ":".join(str(arg) for arg in args)
        return f"{prefix}{key_data}"
    
    def _generate_query_hash(self, project_id: str, query: str, filters: Dict[str, Any] = None) -> str:
        """Generate hash for query caching"""
        query_data = {
            "project_id": project_id,
            "query": query.lower().strip(),
            "filters": filters or {}
        }
        
        # Create deterministic hash
        query_string = json.dumps(query_data, sort_keys=True)
        return hashlib.md5(query_string.encode()).hexdigest()
    
    async def cache_search_results(
        self,
        project_id: str,
        query: str,
        results: List[SearchResult],
        filters: Dict[str, Any] = None,
        ttl: int = None
    ) -> bool:
        """
        Cache search results
        
        Args:
            project_id: Project ID
            query: Search query
            results: Search results to cache
            filters: Search filters applied
            ttl: Time to live in seconds
            
        Returns:
            True if cached successfully
        """
        try:
            redis = await self._get_redis()
            if not redis:
                return False
            
            # Generate cache key
            query_hash = self._generate_query_hash(project_id, query, filters)
            cache_key = self._generate_cache_key(self.SEARCH_RESULTS_PREFIX, query_hash)
            
            # Prepare cache data
            cache_data = {
                "query": query,
                "project_id": project_id,
                "filters": filters or {},
                "results": [result.to_dict() for result in results],
                "cached_at": datetime.utcnow().isoformat(),
                "result_count": len(results)
            }
            
            # Cache with TTL
            cache_ttl = ttl or self._cache_ttl
            await redis.setex(
                cache_key,
                cache_ttl,
                json.dumps(cache_data, default=str)
            )
            
            logger.info(f"Cached search results for query '{query[:50]}...' with {len(results)} results")
            return True
            
        except Exception as e:
            logger.error(f"Error caching search results: {e}")
            return False
    
    async def get_cached_search_results(
        self,
        project_id: str,
        query: str,
        filters: Dict[str, Any] = None
    ) -> Optional[List[SearchResult]]:
        """
        Get cached search results
        
        Args:
            project_id: Project ID
            query: Search query
            filters: Search filters applied
            
        Returns:
            Cached search results or None if not found
        """
        try:
            redis = await self._get_redis()
            if not redis:
                return None
            
            # Generate cache key
            query_hash = self._generate_query_hash(project_id, query, filters)
            cache_key = self._generate_cache_key(self.SEARCH_RESULTS_PREFIX, query_hash)
            
            # Get cached data
            cached_data = await redis.get(cache_key)
            if not cached_data:
                return None
            
            # Parse cached data
            cache_obj = json.loads(cached_data)
            
            # Convert back to SearchResult objects
            results = []
            for result_data in cache_obj.get("results", []):
                result = SearchResult(
                    chunk_id=result_data["chunk_id"],
                    file_id=result_data["file_id"],
                    project_id=result_data["project_id"],
                    content=result_data["content"],
                    similarity_score=result_data["similarity_score"],
                    metadata_score=result_data.get("metadata_score", 0.0),
                    entity_matches=result_data.get("entity_matches", []),
                    highlights=result_data.get("highlights", []),
                    context=result_data.get("context", {})
                )
                results.append(result)
            
            logger.info(f"Retrieved {len(results)} cached results for query '{query[:50]}...'")
            return results
            
        except Exception as e:
            logger.error(f"Error getting cached search results: {e}")
            return None
    
    async def cache_query_suggestions(
        self,
        project_id: str,
        partial_query: str,
        suggestions: List[str],
        ttl: int = None
    ) -> bool:
        """
        Cache autocomplete suggestions
        
        Args:
            project_id: Project ID
            partial_query: Partial query for autocomplete
            suggestions: List of suggestions
            ttl: Time to live in seconds
            
        Returns:
            True if cached successfully
        """
        try:
            redis = await self._get_redis()
            if not redis:
                return False
            
            cache_key = self._generate_cache_key(
                self.QUERY_SUGGESTIONS_PREFIX, 
                project_id, 
                partial_query.lower().strip()
            )
            
            cache_data = {
                "partial_query": partial_query,
                "suggestions": suggestions,
                "cached_at": datetime.utcnow().isoformat()
            }
            
            cache_ttl = ttl or self._cache_ttl
            await redis.setex(
                cache_key,
                cache_ttl,
                json.dumps(cache_data)
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error caching query suggestions: {e}")
            return False
    
    async def get_cached_query_suggestions(
        self,
        project_id: str,
        partial_query: str
    ) -> Optional[List[str]]:
        """
        Get cached autocomplete suggestions
        
        Args:
            project_id: Project ID
            partial_query: Partial query for autocomplete
            
        Returns:
            Cached suggestions or None if not found
        """
        try:
            redis = await self._get_redis()
            if not redis:
                return None
            
            cache_key = self._generate_cache_key(
                self.QUERY_SUGGESTIONS_PREFIX,
                project_id,
                partial_query.lower().strip()
            )
            
            cached_data = await redis.get(cache_key)
            if not cached_data:
                return None
            
            cache_obj = json.loads(cached_data)
            return cache_obj.get("suggestions", [])
            
        except Exception as e:
            logger.error(f"Error getting cached query suggestions: {e}")
            return None
    
    async def track_popular_queries(
        self,
        project_id: str,
        query: str,
        result_count: int
    ) -> bool:
        """
        Track popular queries for analytics
        
        Args:
            project_id: Project ID
            query: Search query
            result_count: Number of results returned
            
        Returns:
            True if tracked successfully
        """
        try:
            redis = await self._get_redis()
            if not redis:
                return False
            
            # Track query frequency
            query_key = self._generate_cache_key(
                self.POPULAR_QUERIES_PREFIX,
                project_id,
                "frequency"
            )
            
            # Increment query count
            await redis.zincrby(query_key, 1, query)
            await redis.expire(query_key, self._popular_queries_ttl)
            
            # Track query performance
            performance_key = self._generate_cache_key(
                self.POPULAR_QUERIES_PREFIX,
                project_id,
                "performance"
            )
            
            performance_data = {
                "query": query,
                "result_count": result_count,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            await redis.lpush(performance_key, json.dumps(performance_data))
            await redis.ltrim(performance_key, 0, 999)  # Keep last 1000 queries
            await redis.expire(performance_key, self._popular_queries_ttl)
            
            return True
            
        except Exception as e:
            logger.error(f"Error tracking popular queries: {e}")
            return False
    
    async def get_popular_queries(
        self,
        project_id: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get popular queries for a project
        
        Args:
            project_id: Project ID
            limit: Maximum number of queries to return
            
        Returns:
            List of popular queries with scores
        """
        try:
            redis = await self._get_redis()
            if not redis:
                return []
            
            query_key = self._generate_cache_key(
                self.POPULAR_QUERIES_PREFIX,
                project_id,
                "frequency"
            )
            
            # Get top queries by score
            popular_queries = await redis.zrevrange(
                query_key, 0, limit - 1, withscores=True
            )
            
            result = []
            for query, score in popular_queries:
                result.append({
                    "query": query.decode() if isinstance(query, bytes) else query,
                    "frequency": int(score)
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting popular queries: {e}")
            return []
    
    async def cache_performance_metrics(
        self,
        project_id: str,
        metrics: Dict[str, Any]
    ) -> bool:
        """
        Cache performance metrics
        
        Args:
            project_id: Project ID
            metrics: Performance metrics to cache
            
        Returns:
            True if cached successfully
        """
        try:
            redis = await self._get_redis()
            if not redis:
                return False
            
            cache_key = self._generate_cache_key(
                self.PERFORMANCE_METRICS_PREFIX,
                project_id
            )
            
            metrics_data = {
                **metrics,
                "cached_at": datetime.utcnow().isoformat()
            }
            
            await redis.setex(
                cache_key,
                self._performance_metrics_ttl,
                json.dumps(metrics_data, default=str)
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error caching performance metrics: {e}")
            return False
    
    async def get_cached_performance_metrics(
        self,
        project_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get cached performance metrics
        
        Args:
            project_id: Project ID
            
        Returns:
            Cached performance metrics or None if not found
        """
        try:
            redis = await self._get_redis()
            if not redis:
                return None
            
            cache_key = self._generate_cache_key(
                self.PERFORMANCE_METRICS_PREFIX,
                project_id
            )
            
            cached_data = await redis.get(cache_key)
            if not cached_data:
                return None
            
            return json.loads(cached_data)
            
        except Exception as e:
            logger.error(f"Error getting cached performance metrics: {e}")
            return None
    
    async def optimize_query(self, query: str) -> str:
        """
        Optimize search query for better results
        
        Args:
            query: Original search query
            
        Returns:
            Optimized query
        """
        try:
            # Basic query optimization
            optimized = query.strip()
            
            # Remove excessive whitespace
            optimized = " ".join(optimized.split())
            
            # Convert to lowercase for consistency
            optimized = optimized.lower()
            
            # Remove common stop words that don't add semantic value
            stop_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by"}
            words = optimized.split()
            
            # Only remove stop words if query has more than 2 words
            if len(words) > 2:
                filtered_words = [word for word in words if word not in stop_words]
                if filtered_words:  # Ensure we don't remove all words
                    optimized = " ".join(filtered_words)
            
            return optimized
            
        except Exception as e:
            logger.error(f"Error optimizing query: {e}")
            return query
    
    async def invalidate_cache(
        self,
        project_id: str,
        pattern: str = None
    ) -> int:
        """
        Invalidate cached data for a project
        
        Args:
            project_id: Project ID
            pattern: Optional pattern to match specific cache keys
            
        Returns:
            Number of keys deleted
        """
        try:
            redis = await self._get_redis()
            if not redis:
                return 0
            
            if pattern:
                search_pattern = f"*{project_id}*{pattern}*"
            else:
                search_pattern = f"*{project_id}*"
            
            # Find matching keys
            keys = await redis.keys(search_pattern)
            
            if keys:
                # Delete matching keys
                deleted_count = await redis.delete(*keys)
                logger.info(f"Invalidated {deleted_count} cache keys for project {project_id}")
                return deleted_count
            
            return 0
            
        except Exception as e:
            logger.error(f"Error invalidating cache: {e}")
            return 0
    
    async def get_cache_statistics(self, project_id: str) -> Dict[str, Any]:
        """
        Get cache statistics for a project
        
        Args:
            project_id: Project ID
            
        Returns:
            Cache statistics
        """
        try:
            redis = await self._get_redis()
            if not redis:
                return {}
            
            # Count cached items by type
            search_results_pattern = f"{self.SEARCH_RESULTS_PREFIX}*{project_id}*"
            suggestions_pattern = f"{self.QUERY_SUGGESTIONS_PREFIX}*{project_id}*"
            
            search_results_keys = await redis.keys(search_results_pattern)
            suggestions_keys = await redis.keys(suggestions_pattern)
            
            # Get popular queries count
            popular_queries = await self.get_popular_queries(project_id, 100)
            
            stats = {
                "cached_search_results": len(search_results_keys),
                "cached_suggestions": len(suggestions_keys),
                "popular_queries_count": len(popular_queries),
                "cache_ttl_seconds": self._cache_ttl,
                "project_id": project_id
            }
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting cache statistics: {e}")
            return {}
    
    async def preload_popular_queries(self, project_id: str, limit: int = 20) -> int:
        """
        Preload cache for popular queries
        
        Args:
            project_id: Project ID
            limit: Number of popular queries to preload
            
        Returns:
            Number of queries preloaded
        """
        try:
            # This would be implemented to work with the search service
            # to preload cache for the most popular queries
            popular_queries = await self.get_popular_queries(project_id, limit)
            
            preloaded_count = 0
            for query_data in popular_queries:
                query = query_data["query"]
                
                # Check if already cached
                cached_results = await self.get_cached_search_results(project_id, query)
                if not cached_results:
                    # Would trigger search and cache here
                    # This is a placeholder for the actual implementation
                    preloaded_count += 1
            
            logger.info(f"Preloaded cache for {preloaded_count} popular queries")
            return preloaded_count
            
        except Exception as e:
            logger.error(f"Error preloading popular queries: {e}")
            return 0