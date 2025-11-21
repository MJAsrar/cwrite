from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, TypeVar, Generic
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection
from pymongo.errors import DuplicateKeyError
import logging
from datetime import datetime

from app.core.database import get_database
from app.core.config import settings

logger = logging.getLogger(__name__)

T = TypeVar('T')


class BaseRepository(ABC, Generic[T]):
    """Base repository class with common CRUD operations"""
    
    def __init__(self, collection_name: str):
        self.collection_name = f"{settings.MONGODB_COLLECTION_PREFIX}{collection_name}"
        self._collection: Optional[AsyncIOMotorCollection] = None
    
    @property
    def collection(self) -> AsyncIOMotorCollection:
        """Get the MongoDB collection"""
        if self._collection is None:
            database = get_database()
            if database is None:
                raise RuntimeError("Database connection not available")
            self._collection = database[self.collection_name]
        return self._collection
    
    @abstractmethod
    def _to_model(self, document: Dict[str, Any]) -> T:
        """Convert MongoDB document to model instance"""
        pass
    
    @abstractmethod
    def _to_document(self, model: T) -> Dict[str, Any]:
        """Convert model instance to MongoDB document"""
        pass
    
    def _prepare_document_for_insert(self, document: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare document for insertion (add timestamps, etc.)"""
        now = datetime.utcnow()
        document["created_at"] = now
        document["updated_at"] = now
        return document
    
    def _prepare_document_for_update(self, document: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare document for update (update timestamp, etc.)"""
        document["updated_at"] = datetime.utcnow()
        # Remove _id if present to avoid update conflicts
        document.pop("_id", None)
        return document
    
    async def create(self, model: T) -> T:
        """Create a new document"""
        try:
            document = self._to_document(model)
            document = self._prepare_document_for_insert(document)
            
            result = await self.collection.insert_one(document)
            document["_id"] = result.inserted_id
            
            logger.info(f"Created document in {self.collection_name} with id: {result.inserted_id}")
            return self._to_model(document)
            
        except DuplicateKeyError as e:
            logger.error(f"Duplicate key error in {self.collection_name}: {e}")
            raise ValueError("Document with this key already exists")
        except Exception as e:
            logger.error(f"Error creating document in {self.collection_name}: {e}")
            raise
    
    async def get_by_id(self, document_id: str) -> Optional[T]:
        """Get document by ID"""
        try:
            if not ObjectId.is_valid(document_id):
                return None
            
            document = await self.collection.find_one({"_id": ObjectId(document_id)})
            return self._to_model(document) if document else None
            
        except Exception as e:
            logger.error(f"Error getting document by id {document_id} from {self.collection_name}: {e}")
            raise
    
    async def get_by_filter(self, filter_dict: Dict[str, Any]) -> Optional[T]:
        """Get single document by filter"""
        try:
            document = await self.collection.find_one(filter_dict)
            return self._to_model(document) if document else None
            
        except Exception as e:
            logger.error(f"Error getting document by filter from {self.collection_name}: {e}")
            raise
    
    async def get_many(
        self, 
        filter_dict: Dict[str, Any] = None, 
        skip: int = 0, 
        limit: int = 100,
        sort: List[tuple] = None
    ) -> List[T]:
        """Get multiple documents with pagination and sorting"""
        try:
            filter_dict = filter_dict or {}
            cursor = self.collection.find(filter_dict)
            
            if sort:
                cursor = cursor.sort(sort)
            
            cursor = cursor.skip(skip).limit(limit)
            documents = await cursor.to_list(length=limit)
            
            return [self._to_model(doc) for doc in documents]
            
        except Exception as e:
            logger.error(f"Error getting documents from {self.collection_name}: {e}")
            raise
    
    async def get_many_by_ids(self, document_ids: List[str]) -> List[T]:
        """Get multiple documents by their IDs"""
        try:
            # Convert string IDs to ObjectIds, filtering out invalid ones
            object_ids = []
            for doc_id in document_ids:
                if ObjectId.is_valid(doc_id):
                    object_ids.append(ObjectId(doc_id))
                else:
                    logger.warning(f"Invalid ObjectId: {doc_id}")
            
            if not object_ids:
                logger.debug(f"No valid ObjectIds provided to get_many_by_ids")
                return []
            
            logger.debug(f"Querying {self.collection_name} for {len(object_ids)} ObjectIds")
            
            # Query MongoDB for all documents with these IDs
            cursor = self.collection.find({"_id": {"$in": object_ids}})
            documents = await cursor.to_list(length=len(object_ids))
            
            logger.debug(f"Found {len(documents)} documents in {self.collection_name}")
            
            return [self._to_model(doc) for doc in documents]
            
        except Exception as e:
            logger.error(f"Error getting documents by ids from {self.collection_name}: {e}")
            raise
    
    async def count(self, filter_dict: Dict[str, Any] = None) -> int:
        """Count documents matching filter"""
        try:
            filter_dict = filter_dict or {}
            return await self.collection.count_documents(filter_dict)
            
        except Exception as e:
            logger.error(f"Error counting documents in {self.collection_name}: {e}")
            raise
    
    async def update_by_id(self, document_id: str, update_data: Dict[str, Any]) -> Optional[T]:
        """Update document by ID"""
        try:
            if not ObjectId.is_valid(document_id):
                return None
            
            update_data = self._prepare_document_for_update(update_data)
            
            result = await self.collection.find_one_and_update(
                {"_id": ObjectId(document_id)},
                {"$set": update_data},
                return_document=True
            )
            
            if result:
                logger.info(f"Updated document {document_id} in {self.collection_name}")
                return self._to_model(result)
            return None
            
        except Exception as e:
            logger.error(f"Error updating document {document_id} in {self.collection_name}: {e}")
            raise
    
    async def update_by_filter(
        self, 
        filter_dict: Dict[str, Any], 
        update_data: Dict[str, Any]
    ) -> int:
        """Update multiple documents by filter"""
        try:
            update_data = self._prepare_document_for_update(update_data)
            
            result = await self.collection.update_many(
                filter_dict,
                {"$set": update_data}
            )
            
            logger.info(f"Updated {result.modified_count} documents in {self.collection_name}")
            return result.modified_count
            
        except Exception as e:
            logger.error(f"Error updating documents in {self.collection_name}: {e}")
            raise
    
    async def delete_by_id(self, document_id: str) -> bool:
        """Delete document by ID"""
        try:
            if not ObjectId.is_valid(document_id):
                return False
            
            result = await self.collection.delete_one({"_id": ObjectId(document_id)})
            
            if result.deleted_count > 0:
                logger.info(f"Deleted document {document_id} from {self.collection_name}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error deleting document {document_id} from {self.collection_name}: {e}")
            raise
    
    async def delete_by_filter(self, filter_dict: Dict[str, Any]) -> int:
        """Delete multiple documents by filter"""
        try:
            result = await self.collection.delete_many(filter_dict)
            
            logger.info(f"Deleted {result.deleted_count} documents from {self.collection_name}")
            return result.deleted_count
            
        except Exception as e:
            logger.error(f"Error deleting documents from {self.collection_name}: {e}")
            raise
    
    async def exists(self, filter_dict: Dict[str, Any]) -> bool:
        """Check if document exists"""
        try:
            count = await self.collection.count_documents(filter_dict, limit=1)
            return count > 0
            
        except Exception as e:
            logger.error(f"Error checking document existence in {self.collection_name}: {e}")
            raise
    
    async def aggregate(self, pipeline: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Execute aggregation pipeline"""
        try:
            cursor = self.collection.aggregate(pipeline)
            return await cursor.to_list(length=None)
            
        except Exception as e:
            logger.error(f"Error executing aggregation in {self.collection_name}: {e}")
            raise


class DatabaseManager:
    """Database manager for handling connections and transactions"""
    
    @staticmethod
    async def health_check() -> Dict[str, Any]:
        """Check database health"""
        try:
            database = get_database()
            if database is None:
                return {"status": "unhealthy", "message": "Database connection not available"}
            
            # Ping the database
            await database.command("ping")
            
            # Get database stats
            stats = await database.command("dbStats")
            
            return {
                "status": "healthy",
                "database": database.name,
                "collections": stats.get("collections", 0),
                "data_size": stats.get("dataSize", 0),
                "index_size": stats.get("indexSize", 0)
            }
            
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {"status": "unhealthy", "message": str(e)}
    
    @staticmethod
    async def create_collection_if_not_exists(collection_name: str) -> bool:
        """Create collection if it doesn't exist"""
        try:
            database = get_database()
            if database is None:
                return False
            
            collections = await database.list_collection_names()
            full_collection_name = f"{settings.MONGODB_COLLECTION_PREFIX}{collection_name}"
            
            if full_collection_name not in collections:
                await database.create_collection(full_collection_name)
                logger.info(f"Created collection: {full_collection_name}")
                return True
            
            return True
            
        except Exception as e:
            logger.error(f"Error creating collection {collection_name}: {e}")
            return False