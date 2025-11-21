from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorGridFSBucket
from pymongo import IndexModel, TEXT, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
import logging
from typing import Optional, Dict, Any
import asyncio
from contextlib import asynccontextmanager

from app.core.config import settings

logger = logging.getLogger(__name__)


class Database:
    client: Optional[AsyncIOMotorClient] = None
    database: Optional[AsyncIOMotorDatabase] = None
    gridfs: Optional[AsyncIOMotorGridFSBucket] = None
    _connection_lock = asyncio.Lock()
    _is_connected = False


db = Database()


async def connect_to_mongo():
    """Create database connection with connection pooling"""
    async with db._connection_lock:
        if db._is_connected:
            return
        
        try:
            logger.info("Connecting to MongoDB...")
            
            # Enhanced connection configuration
            db.client = AsyncIOMotorClient(
                settings.DATABASE_URL,
                maxPoolSize=20,  # Increased pool size
                minPoolSize=5,   # Minimum connections
                maxIdleTimeMS=30000,  # 30 seconds idle timeout
                serverSelectionTimeoutMS=10000,  # 10 seconds timeout
                connectTimeoutMS=10000,  # 10 seconds connect timeout
                socketTimeoutMS=20000,  # 20 seconds socket timeout
                retryWrites=True,
                w="majority",  # Write concern
                readPreference="primary"
            )
            
            # Test the connection with retry logic
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    await db.client.admin.command('ping')
                    break
                except (ConnectionFailure, ServerSelectionTimeoutError) as e:
                    if attempt == max_retries - 1:
                        raise e
                    logger.warning(f"Connection attempt {attempt + 1} failed, retrying...")
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
            
            db.database = db.client[settings.MONGODB_DB_NAME]
            db.gridfs = AsyncIOMotorGridFSBucket(db.database)
            
            # Create indexes
            await create_indexes()
            
            db._is_connected = True
            logger.info("Successfully connected to MongoDB")
            
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            db.client = None
            db.database = None
            db.gridfs = None
            db._is_connected = False
            raise


async def close_mongo_connection():
    """Close database connection"""
    async with db._connection_lock:
        if db.client:
            db.client.close()
            db.client = None
            db.database = None
            db.gridfs = None
            db._is_connected = False
            logger.info("Disconnected from MongoDB")


async def create_indexes():
    """Create database indexes for optimal query performance"""
    if db.database is None:
        logger.warning("Database not connected, skipping index creation")
        return
    
    async def safe_create_index(collection, index_spec, **kwargs):
        """Safely create index, ignoring if it already exists"""
        try:
            await collection.create_index(index_spec, **kwargs)
        except Exception as e:
            if "already exists" in str(e) or "IndexKeySpecsConflict" in str(e):
                logger.debug(f"Index already exists, skipping: {index_spec}")
            else:
                logger.warning(f"Failed to create index {index_spec}: {e}")
    
    try:
        # Users collection indexes
        users_collection = db.database[f"{settings.MONGODB_COLLECTION_PREFIX}users"]
        await safe_create_index(users_collection, [("email", ASCENDING)], unique=True)
        await safe_create_index(users_collection, [("created_at", DESCENDING)])
        await safe_create_index(users_collection, [("last_login", DESCENDING)])
        
        # Projects collection indexes
        projects_collection = db.database[f"{settings.MONGODB_COLLECTION_PREFIX}projects"]
        await safe_create_index(projects_collection, [("owner_id", ASCENDING)])
        await safe_create_index(projects_collection, [("created_at", DESCENDING)])
        await safe_create_index(projects_collection, [("updated_at", DESCENDING)])
        await safe_create_index(projects_collection, [("indexing_status", ASCENDING)])
        await safe_create_index(projects_collection, [("name", TEXT)])
        
        # Files collection indexes
        files_collection = db.database[f"{settings.MONGODB_COLLECTION_PREFIX}files"]
        await safe_create_index(files_collection, [("project_id", ASCENDING)])
        await safe_create_index(files_collection, [("gridfs_id", ASCENDING)], unique=True)
        await safe_create_index(files_collection, [("filename", ASCENDING)])
        await safe_create_index(files_collection, [("upload_status", ASCENDING)])
        await safe_create_index(files_collection, [("processing_status", ASCENDING)])
        await safe_create_index(files_collection, [("created_at", DESCENDING)])
        
        # Entities collection indexes
        entities_collection = db.database[f"{settings.MONGODB_COLLECTION_PREFIX}entities"]
        await safe_create_index(entities_collection, [("project_id", ASCENDING)])
        await safe_create_index(entities_collection, [("type", ASCENDING)])
        await safe_create_index(entities_collection, [("name", TEXT)])
        await safe_create_index(entities_collection, [("confidence_score", DESCENDING)])
        await safe_create_index(entities_collection, [("mention_count", DESCENDING)])
        await safe_create_index(entities_collection, [
            ("project_id", ASCENDING), 
            ("type", ASCENDING), 
            ("name", ASCENDING)
        ], unique=True)
        
        # Text chunks collection indexes
        chunks_collection = db.database[f"{settings.MONGODB_COLLECTION_PREFIX}text_chunks"]
        await safe_create_index(chunks_collection, [("file_id", ASCENDING)])
        await safe_create_index(chunks_collection, [("project_id", ASCENDING)])
        await safe_create_index(chunks_collection, [("chunk_index", ASCENDING)])
        await safe_create_index(chunks_collection, [
            ("file_id", ASCENDING), 
            ("chunk_index", ASCENDING)
        ], unique=True)
        
        # Relationships collection indexes
        relationships_collection = db.database[f"{settings.MONGODB_COLLECTION_PREFIX}relationships"]
        await safe_create_index(relationships_collection, [("project_id", ASCENDING)])
        await safe_create_index(relationships_collection, [("source_entity_id", ASCENDING)])
        await safe_create_index(relationships_collection, [("target_entity_id", ASCENDING)])
        await safe_create_index(relationships_collection, [("relationship_type", ASCENDING)])
        await safe_create_index(relationships_collection, [("strength", DESCENDING)])
        await safe_create_index(relationships_collection, [
            ("source_entity_id", ASCENDING), 
            ("target_entity_id", ASCENDING)
        ], unique=True)
        
        # Search logs collection indexes
        search_logs_collection = db.database[f"{settings.MONGODB_COLLECTION_PREFIX}search_logs"]
        await safe_create_index(search_logs_collection, [("user_id", ASCENDING)])
        await safe_create_index(search_logs_collection, [("project_id", ASCENDING)])
        await safe_create_index(search_logs_collection, [("query_hash", ASCENDING)])
        await safe_create_index(search_logs_collection, [("created_at", DESCENDING)])
        await safe_create_index(search_logs_collection, [("response_time_ms", ASCENDING)])
        
        # Indexing status collection indexes
        indexing_status_collection = db.database[f"{settings.MONGODB_COLLECTION_PREFIX}indexing_status"]
        await safe_create_index(indexing_status_collection, [("project_id", ASCENDING)])
        await safe_create_index(indexing_status_collection, [("task_id", ASCENDING)], unique=True)
        await safe_create_index(indexing_status_collection, [("task_type", ASCENDING)])
        await safe_create_index(indexing_status_collection, [("status", ASCENDING)])
        await safe_create_index(indexing_status_collection, [("created_at", DESCENDING)])
        await safe_create_index(indexing_status_collection, [("updated_at", DESCENDING)])
        await safe_create_index(indexing_status_collection, [
            ("project_id", ASCENDING), 
            ("task_type", ASCENDING), 
            ("status", ASCENDING)
        ])
        
        logger.info("Database indexes created successfully")
        
    except Exception as e:
        logger.error(f"Failed to create indexes: {e}")
        raise


def get_database() -> Optional[AsyncIOMotorDatabase]:
    """Get database instance"""
    return db.database


def get_gridfs() -> Optional[AsyncIOMotorGridFSBucket]:
    """Get GridFS instance"""
    return db.gridfs


@asynccontextmanager
async def get_database_session():
    """Context manager for database operations with error handling"""
    try:
        if not db._is_connected:
            await connect_to_mongo()
        yield db.database
    except Exception as e:
        logger.error(f"Database session error: {e}")
        raise


async def ensure_connection():
    """Ensure database connection is active"""
    if not db._is_connected or not db.client:
        await connect_to_mongo()
    
    try:
        # Test connection
        await db.client.admin.command('ping')
    except Exception as e:
        logger.warning(f"Connection test failed, reconnecting: {e}")
        await connect_to_mongo()


async def get_collection_stats(collection_name: str) -> Dict[str, Any]:
    """Get statistics for a specific collection"""
    try:
        if not db.database:
            return {"error": "Database not connected"}
        
        full_name = f"{settings.MONGODB_COLLECTION_PREFIX}{collection_name}"
        stats = await db.database.command("collStats", full_name)
        
        return {
            "name": full_name,
            "count": stats.get("count", 0),
            "size": stats.get("size", 0),
            "avgObjSize": stats.get("avgObjSize", 0),
            "storageSize": stats.get("storageSize", 0),
            "totalIndexSize": stats.get("totalIndexSize", 0),
            "indexSizes": stats.get("indexSizes", {})
        }
    except Exception as e:
        logger.error(f"Error getting collection stats for {collection_name}: {e}")
        return {"error": str(e)}


async def drop_collection(collection_name: str) -> bool:
    """Drop a collection (use with caution)"""
    try:
        if not db.database:
            return False
        
        full_name = f"{settings.MONGODB_COLLECTION_PREFIX}{collection_name}"
        await db.database.drop_collection(full_name)
        logger.warning(f"Dropped collection: {full_name}")
        return True
        
    except Exception as e:
        logger.error(f"Error dropping collection {collection_name}: {e}")
        return False


async def create_backup_indexes():
    """Create backup of current indexes configuration"""
    try:
        if not db.database:
            return None
        
        collections = await db.database.list_collection_names()
        backup_info = {}
        
        for collection_name in collections:
            if collection_name.startswith(settings.MONGODB_COLLECTION_PREFIX):
                collection = db.database[collection_name]
                indexes = await collection.list_indexes().to_list(length=None)
                backup_info[collection_name] = indexes
        
        return backup_info
        
    except Exception as e:
        logger.error(f"Error creating index backup: {e}")
        return None


def get_database() -> Optional[AsyncIOMotorDatabase]:
    """Get database instance"""
    return db.database


def get_gridfs() -> Optional[AsyncIOMotorGridFSBucket]:
    """Get GridFS instance"""
    return db.gridfs


def is_connected() -> bool:
    """Check if database is connected"""
    return db._is_connected and db.client is not None