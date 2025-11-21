from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from bson import ObjectId
import logging

from app.core.repository import BaseRepository
from app.models.search_log import SearchLog

logger = logging.getLogger(__name__)


class SearchLogRepository(BaseRepository[SearchLog]):
    """SearchLog repository with CRUD operations"""
    
    def __init__(self):
        super().__init__("search_logs")
    
    def _to_model(self, document: Dict[str, Any]) -> SearchLog:
        """Convert MongoDB document to SearchLog model"""
        return SearchLog.from_dict(document)
    
    def _to_document(self, model: SearchLog) -> Dict[str, Any]:
        """Convert SearchLog model to MongoDB document"""
        return model.to_dict()
    
    async def get_by_user(self, user_id: str, skip: int = 0, limit: int = 100) -> List[SearchLog]:
        """Get search logs by user ID"""
        return await self.get_many(
            {"user_id": ObjectId(user_id)}, 
            skip=skip, 
            limit=limit,
            sort=[("created_at", -1)]
        )
    
    async def get_by_project(self, project_id: str, skip: int = 0, limit: int = 100) -> List[SearchLog]:
        """Get search logs by project ID"""
        return await self.get_many(
            {"project_id": ObjectId(project_id)}, 
            skip=skip, 
            limit=limit,
            sort=[("created_at", -1)]
        )
    
    async def get_by_query_hash(self, query_hash: str) -> Optional[SearchLog]:
        """Get search log by query hash (for caching)"""
        return await self.get_by_filter({"query_hash": query_hash})
    
    async def get_recent_searches(self, user_id: str, hours: int = 24, limit: int = 10) -> List[SearchLog]:
        """Get recent searches for a user"""
        since = datetime.utcnow() - timedelta(hours=hours)
        return await self.get_many(
            {
                "user_id": ObjectId(user_id),
                "created_at": {"$gte": since}
            },
            limit=limit,
            sort=[("created_at", -1)]
        )
    
    async def get_popular_queries(self, project_id: Optional[str] = None, days: int = 7, limit: int = 10) -> List[Dict[str, Any]]:
        """Get popular search queries"""
        try:
            since = datetime.utcnow() - timedelta(days=days)
            
            match_filter = {"created_at": {"$gte": since}}
            if project_id:
                match_filter["project_id"] = ObjectId(project_id)
            
            pipeline = [
                {"$match": match_filter},
                {"$group": {
                    "_id": "$query",
                    "count": {"$sum": 1},
                    "avg_response_time": {"$avg": "$response_time_ms"},
                    "avg_results": {"$avg": "$result_count"}
                }},
                {"$sort": {"count": -1}},
                {"$limit": limit}
            ]
            
            return await self.aggregate(pipeline)
            
        except Exception as e:
            logger.error(f"Error getting popular queries: {e}")
            return []
    
    async def add_clicked_result(self, log_id: str, result_id: str) -> Optional[SearchLog]:
        """Add clicked result to search log"""
        try:
            result = await self.collection.find_one_and_update(
                {"_id": ObjectId(log_id)},
                {"$addToSet": {"clicked_results": ObjectId(result_id)}},
                return_document=True
            )
            
            return self._to_model(result) if result else None
            
        except Exception as e:
            logger.error(f"Error adding clicked result to search log {log_id}: {e}")
            raise
    
    async def get_search_analytics(self, project_id: Optional[str] = None, days: int = 30) -> Dict[str, Any]:
        """Get search analytics"""
        try:
            since = datetime.utcnow() - timedelta(days=days)
            
            match_filter = {"created_at": {"$gte": since}}
            if project_id:
                match_filter["project_id"] = ObjectId(project_id)
            
            pipeline = [
                {"$match": match_filter},
                {"$group": {
                    "_id": None,
                    "total_searches": {"$sum": 1},
                    "unique_queries": {"$addToSet": "$query"},
                    "avg_response_time": {"$avg": "$response_time_ms"},
                    "avg_results": {"$avg": "$result_count"},
                    "total_clicks": {"$sum": {"$size": "$clicked_results"}}
                }},
                {"$addFields": {
                    "unique_query_count": {"$size": "$unique_queries"}
                }},
                {"$project": {
                    "unique_queries": 0  # Remove the large array from output
                }}
            ]
            
            result = await self.aggregate(pipeline)
            
            if result:
                analytics = result[0]
                # Calculate click-through rate
                if analytics["total_searches"] > 0:
                    analytics["click_through_rate"] = analytics["total_clicks"] / analytics["total_searches"]
                else:
                    analytics["click_through_rate"] = 0.0
                
                return analytics
            
            return {
                "total_searches": 0,
                "unique_query_count": 0,
                "avg_response_time": 0.0,
                "avg_results": 0.0,
                "total_clicks": 0,
                "click_through_rate": 0.0
            }
            
        except Exception as e:
            logger.error(f"Error getting search analytics: {e}")
            return {
                "total_searches": 0,
                "unique_query_count": 0,
                "avg_response_time": 0.0,
                "avg_results": 0.0,
                "total_clicks": 0,
                "click_through_rate": 0.0
            }
    
    async def cleanup_old_logs(self, days: int = 90) -> int:
        """Clean up old search logs"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            return await self.delete_by_filter({"created_at": {"$lt": cutoff_date}})
            
        except Exception as e:
            logger.error(f"Error cleaning up old search logs: {e}")
            return 0
    
    async def get_recent_queries_starting_with(self, project_id: str, partial_query: str, limit: int = 10) -> List[SearchLog]:
        """Get recent queries that start with partial query for autocomplete"""
        try:
            return await self.get_many(
                {
                    "project_id": ObjectId(project_id),
                    "query": {"$regex": f"^{partial_query}", "$options": "i"}
                },
                limit=limit,
                sort=[("created_at", -1)]
            )
        except Exception as e:
            logger.error(f"Error getting recent queries starting with '{partial_query}': {e}")
            return []
    
    async def get_search_stats(self, project_id: str, days: int = 30) -> Dict[str, Any]:
        """Get search statistics for a project"""
        try:
            since = datetime.utcnow() - timedelta(days=days)
            
            pipeline = [
                {"$match": {
                    "project_id": ObjectId(project_id),
                    "created_at": {"$gte": since}
                }},
                {"$group": {
                    "_id": None,
                    "total_searches": {"$sum": 1},
                    "unique_queries": {"$addToSet": "$query"},
                    "avg_results_per_query": {"$avg": "$result_count"},
                    "avg_response_time_ms": {"$avg": "$response_time_ms"}
                }},
                {"$addFields": {
                    "unique_queries": {"$size": "$unique_queries"}
                }}
            ]
            
            result = await self.aggregate(pipeline)
            return result[0] if result else {
                "total_searches": 0,
                "unique_queries": 0,
                "avg_results_per_query": 0,
                "avg_response_time_ms": 0
            }
            
        except Exception as e:
            logger.error(f"Error getting search stats: {e}")
            return {
                "total_searches": 0,
                "unique_queries": 0,
                "avg_results_per_query": 0,
                "avg_response_time_ms": 0
            }
    
    async def get_performance_metrics(self, project_id: str, days: int = 30) -> Dict[str, Any]:
        """Get performance metrics for search operations"""
        try:
            since = datetime.utcnow() - timedelta(days=days)
            
            pipeline = [
                {"$match": {
                    "project_id": ObjectId(project_id),
                    "created_at": {"$gte": since}
                }},
                {"$group": {
                    "_id": None,
                    "min_response_time": {"$min": "$response_time_ms"},
                    "max_response_time": {"$max": "$response_time_ms"},
                    "avg_response_time": {"$avg": "$response_time_ms"},
                    "p95_response_time": {"$push": "$response_time_ms"}
                }},
                {"$addFields": {
                    "p95_response_time": {
                        "$arrayElemAt": [
                            {"$sortArray": {"input": "$p95_response_time", "sortBy": 1}},
                            {"$floor": {"$multiply": [{"$size": "$p95_response_time"}, 0.95]}}
                        ]
                    }
                }}
            ]
            
            result = await self.aggregate(pipeline)
            return result[0] if result else {
                "min_response_time": 0,
                "max_response_time": 0,
                "avg_response_time": 0,
                "p95_response_time": 0
            }
            
        except Exception as e:
            logger.error(f"Error getting performance metrics: {e}")
            return {
                "min_response_time": 0,
                "max_response_time": 0,
                "avg_response_time": 0,
                "p95_response_time": 0
            }

    async def get_user_search_patterns(self, user_id: str, days: int = 30) -> Dict[str, Any]:
        """Get user search patterns and preferences"""
        try:
            since = datetime.utcnow() - timedelta(days=days)
            
            pipeline = [
                {"$match": {
                    "user_id": ObjectId(user_id),
                    "created_at": {"$gte": since}
                }},
                {"$group": {
                    "_id": None,
                    "total_searches": {"$sum": 1},
                    "avg_query_length": {"$avg": {"$strLenCP": "$query"}},
                    "most_common_words": {"$push": {"$split": ["$query", " "]}},
                    "search_times": {"$push": {"$hour": "$created_at"}},
                    "projects_searched": {"$addToSet": "$project_id"}
                }}
            ]
            
            result = await self.aggregate(pipeline)
            
            if result:
                patterns = result[0]
                # Process most common words
                if patterns.get("most_common_words"):
                    # Flatten the array of word arrays
                    all_words = []
                    for word_list in patterns["most_common_words"]:
                        all_words.extend(word_list)
                    
                    # Count word frequency (simplified)
                    word_counts = {}
                    for word in all_words:
                        word = word.lower().strip()
                        if len(word) > 2:  # Ignore short words
                            word_counts[word] = word_counts.get(word, 0) + 1
                    
                    # Get top 10 words
                    patterns["top_words"] = sorted(word_counts.items(), key=lambda x: x[1], reverse=True)[:10]
                
                # Process search times to find peak hours
                if patterns.get("search_times"):
                    hour_counts = {}
                    for hour in patterns["search_times"]:
                        hour_counts[hour] = hour_counts.get(hour, 0) + 1
                    patterns["peak_hours"] = sorted(hour_counts.items(), key=lambda x: x[1], reverse=True)[:3]
                
                return patterns
            
            return {
                "total_searches": 0,
                "avg_query_length": 0.0,
                "top_words": [],
                "peak_hours": [],
                "projects_searched": []
            }
            
        except Exception as e:
            logger.error(f"Error getting user search patterns for {user_id}: {e}")
            return {
                "total_searches": 0,
                "avg_query_length": 0.0,
                "top_words": [],
                "peak_hours": [],
                "projects_searched": []
            }    
async def get_search_trends(self, project_id: str, days: int = 30) -> List[Dict[str, Any]]:
        """Get search trends over time for analytics"""
        try:
            since_date = datetime.utcnow() - timedelta(days=days)
            
            pipeline = [
                {
                    "$match": {
                        "project_id": ObjectId(project_id),
                        "created_at": {"$gte": since_date}
                    }
                },
                {
                    "$group": {
                        "_id": {
                            "$dateToString": {
                                "format": "%Y-%m-%d",
                                "date": "$created_at"
                            }
                        },
                        "count": {"$sum": 1},
                        "avg_response_time": {"$avg": "$response_time_ms"}
                    }
                },
                {
                    "$sort": {"_id": 1}
                }
            ]
            
            cursor = self.collection.aggregate(pipeline)
            results = []
            async for doc in cursor:
                results.append({
                    "date": doc["_id"],
                    "count": doc["count"],
                    "avg_response_time": round(doc.get("avg_response_time", 0), 2)
                })
            
            return results
            
        except Exception as e:
            logger.error(f"Error getting search trends: {e}")
            return []

async def get_slow_queries(self, project_id: str, days: int = 30, limit: int = 5) -> List[Dict[str, Any]]:
        """Get slowest queries for performance optimization"""
        try:
            since_date = datetime.utcnow() - timedelta(days=days)
            
            pipeline = [
                {
                    "$match": {
                        "project_id": ObjectId(project_id),
                        "created_at": {"$gte": since_date},
                        "response_time_ms": {"$gt": 1000}  # Only queries slower than 1 second
                    }
                },
                {
                    "$sort": {"response_time_ms": -1}
                },
                {
                    "$limit": limit
                },
                {
                    "$project": {
                        "query": 1,
                        "response_time": "$response_time_ms",
                        "timestamp": "$created_at"
                    }
                }
            ]
            
            cursor = self.collection.aggregate(pipeline)
            results = []
            async for doc in cursor:
                results.append({
                    "query": doc["query"],
                    "response_time": doc["response_time"],
                    "timestamp": doc["timestamp"].isoformat()
                })
            
            return results
            
        except Exception as e:
            logger.error(f"Error getting slow queries: {e}")
            return []
    
async def get_entity_search_stats(self, project_id: str, days: int = 30) -> List[Dict[str, Any]]:
        """Get search statistics by entity type"""
        try:
            since_date = datetime.utcnow() - timedelta(days=days)
            
            # This is a simplified version - in a real implementation,
            # you'd need to analyze the search queries to determine entity types
            # For now, we'll return mock data based on common patterns
            
            total_searches = await self.collection.count_documents({
                "project_id": ObjectId(project_id),
                "created_at": {"$gte": since_date}
            })
            
            # Mock distribution - in reality, you'd analyze query patterns
            return [
                {"entity_type": "character", "count": int(total_searches * 0.4)},
                {"entity_type": "location", "count": int(total_searches * 0.25)},
                {"entity_type": "theme", "count": int(total_searches * 0.2)},
                {"entity_type": "document", "count": int(total_searches * 0.15)}
            ]
            
        except Exception as e:
            logger.error(f"Error getting entity search stats: {e}")
            return []
    
async def add_clicked_result(self, search_log_id: str, result_id: str) -> bool:
        """Add a clicked result to a search log"""
        try:
            result = await self.collection.update_one(
                {"_id": ObjectId(search_log_id)},
                {"$addToSet": {"clicked_results": ObjectId(result_id)}}
            )
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Error adding clicked result: {e}")
            return False
    
async def get_click_through_rate(self, project_id: str, days: int = 30) -> float:
        """Calculate click-through rate for search results"""
        try:
            since_date = datetime.utcnow() - timedelta(days=days)
            
            pipeline = [
                {
                    "$match": {
                        "project_id": ObjectId(project_id),
                        "created_at": {"$gte": since_date}
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "total_searches": {"$sum": 1},
                        "searches_with_clicks": {
                            "$sum": {
                                "$cond": [
                                    {"$gt": [{"$size": "$clicked_results"}, 0]},
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ]
            
            cursor = self.collection.aggregate(pipeline)
            result = await cursor.to_list(length=1)
            
            if result:
                data = result[0]
                total = data.get("total_searches", 0)
                clicked = data.get("searches_with_clicks", 0)
                return (clicked / total) if total > 0 else 0.0
            
            return 0.0
            
        except Exception as e:
            logger.error(f"Error calculating click-through rate: {e}")
            return 0.0