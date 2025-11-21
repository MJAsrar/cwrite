import logging
from typing import Optional
import json
from datetime import timedelta

try:
    import redis.asyncio as redis_async
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    redis_async = None

from app.core.config import settings

logger = logging.getLogger(__name__)


class RedisClient:
    redis = None


redis_client = RedisClient()


async def connect_to_redis():
    """Create Redis connection"""
    if not REDIS_AVAILABLE:
        logger.warning("Redis not available - running without caching")
        return
        
    try:
        logger.info("Connecting to Redis...")
        
        redis_client.redis = redis_async.from_url(
            settings.REDIS_URL,
            db=settings.REDIS_DB,
            password=settings.REDIS_PASSWORD if settings.REDIS_PASSWORD else None,
            encoding="utf-8",
            decode_responses=True,
            socket_timeout=5,
            socket_connect_timeout=5,
            retry_on_timeout=True,
            health_check_interval=30
        )
        
        # Test the connection
        await redis_client.redis.ping()
        
        logger.info("Successfully connected to Redis")
        
    except Exception as e:
        logger.warning(f"Failed to connect to Redis: {e} - running without caching")
        redis_client.redis = None


async def close_redis_connection():
    """Close Redis connection"""
    if redis_client.redis:
        await redis_client.redis.close()
        logger.info("Disconnected from Redis")


def get_redis():
    """Get Redis instance"""
    return redis_client.redis


async def get_redis_client():
    """Get Redis client instance (async)"""
    return redis_client.redis


class CacheManager:
    """Redis cache management utilities with fallback for when Redis is unavailable"""
    
    # In-memory fallback cache (for development without Redis)
    _memory_cache = {}
    
    @staticmethod
    async def set_cache(key: str, value: any, expire: int = 3600):
        """Set cache with expiration"""
        redis_client = get_redis()
        if redis_client:
            if isinstance(value, (dict, list)):
                value = json.dumps(value)
            await redis_client.setex(key, expire, value)
        else:
            # Fallback to memory cache
            import time
            CacheManager._memory_cache[key] = {
                'value': value,
                'expires': time.time() + expire
            }
    
    @staticmethod
    async def get_cache(key: str) -> Optional[str]:
        """Get cache value"""
        redis_client = get_redis()
        if redis_client:
            return await redis_client.get(key)
        else:
            # Fallback to memory cache
            import time
            if key in CacheManager._memory_cache:
                cache_item = CacheManager._memory_cache[key]
                if time.time() < cache_item['expires']:
                    value = cache_item['value']
                    if isinstance(value, (dict, list)):
                        return json.dumps(value)
                    return str(value)
                else:
                    del CacheManager._memory_cache[key]
            return None
    
    @staticmethod
    async def get_json_cache(key: str) -> Optional[dict]:
        """Get cache value as JSON"""
        value = await CacheManager.get_cache(key)
        if value:
            try:
                return json.loads(value) if isinstance(value, str) else value
            except json.JSONDecodeError:
                return None
        return None
    
    @staticmethod
    async def delete_cache(key: str):
        """Delete cache key"""
        redis_client = get_redis()
        if redis_client:
            await redis_client.delete(key)
        else:
            # Fallback to memory cache
            CacheManager._memory_cache.pop(key, None)
    
    @staticmethod
    async def exists_cache(key: str) -> bool:
        """Check if cache key exists"""
        redis_client = get_redis()
        if redis_client:
            return await redis_client.exists(key)
        else:
            # Fallback to memory cache
            import time
            if key in CacheManager._memory_cache:
                cache_item = CacheManager._memory_cache[key]
                if time.time() < cache_item['expires']:
                    return True
                else:
                    del CacheManager._memory_cache[key]
            return False
    
    @staticmethod
    async def set_session(session_id: str, user_data: dict, expire_days: int = 7):
        """Set user session"""
        expire_seconds = expire_days * 24 * 60 * 60
        await CacheManager.set_cache(f"session:{session_id}", user_data, expire_seconds)
    
    @staticmethod
    async def get_session(session_id: str) -> Optional[dict]:
        """Get user session"""
        return await CacheManager.get_json_cache(f"session:{session_id}")
    
    @staticmethod
    async def delete_session(session_id: str):
        """Delete user session"""
        await CacheManager.delete_cache(f"session:{session_id}")
    
    @staticmethod
    async def increment_rate_limit(key: str, window_seconds: int = 60) -> int:
        """Increment rate limit counter"""
        redis_client = get_redis()
        if redis_client:
            current = await redis_client.incr(key)
            if current == 1:
                await redis_client.expire(key, window_seconds)
            return current
        else:
            # Fallback to memory cache
            import time
            current_time = time.time()
            if key not in CacheManager._memory_cache:
                CacheManager._memory_cache[key] = {
                    'value': 1,
                    'expires': current_time + window_seconds
                }
                return 1
            else:
                cache_item = CacheManager._memory_cache[key]
                if current_time < cache_item['expires']:
                    cache_item['value'] += 1
                    return cache_item['value']
                else:
                    CacheManager._memory_cache[key] = {
                        'value': 1,
                        'expires': current_time + window_seconds
                    }
                    return 1