from typing import Optional, Dict, Any, List
from bson import ObjectId
import logging

from app.core.repository import BaseRepository
from app.models.text_chunk import TextChunk

logger = logging.getLogger(__name__)


class TextChunkRepository(BaseRepository[TextChunk]):
    """TextChunk repository with CRUD operations"""
    
    def __init__(self):
        super().__init__("text_chunks")
    
    def _to_model(self, document: Dict[str, Any]) -> TextChunk:
        """Convert MongoDB document to TextChunk model"""
        return TextChunk.from_dict(document)
    
    def _to_document(self, model: TextChunk) -> Dict[str, Any]:
        """Convert TextChunk model to MongoDB document"""
        return model.to_dict()
    
    async def get_by_file(self, file_id: str, skip: int = 0, limit: int = 100) -> List[TextChunk]:
        """Get text chunks by file ID"""
        return await self.get_many(
            {"file_id": ObjectId(file_id)}, 
            skip=skip, 
            limit=limit,
            sort=[("chunk_index", 1)]
        )
    
    async def get_by_project(self, project_id: str, skip: int = 0, limit: int = 100) -> List[TextChunk]:
        """Get text chunks by project ID"""
        return await self.get_many(
            {"project_id": ObjectId(project_id)}, 
            skip=skip, 
            limit=limit,
            sort=[("created_at", -1)]
        )
    
    async def find_by_project(self, project_id: str) -> List[TextChunk]:
        """Find all text chunks by project ID (no limit)"""
        return await self.get_many(
            {"project_id": ObjectId(project_id)},
            sort=[("created_at", -1)]
        )
    
    async def count_all(self) -> int:
        """Count total number of text chunks"""
        return await self.collection.count_documents({})
    
    async def get_chunk_by_index(self, file_id: str, chunk_index: int) -> Optional[TextChunk]:
        """Get specific chunk by file ID and index"""
        return await self.get_by_filter({
            "file_id": ObjectId(file_id),
            "chunk_index": chunk_index
        })
    
    async def get_chunks_with_embeddings(self, project_id: str, skip: int = 0, limit: int = 100) -> List[TextChunk]:
        """Get chunks that have embedding vectors"""
        return await self.get_many(
            {
                "project_id": ObjectId(project_id),
                "embedding_vector": {"$exists": True, "$ne": None}
            },
            skip=skip,
            limit=limit
        )
    
    async def get_chunks_without_embeddings(self, project_id: str, limit: int = 100) -> List[TextChunk]:
        """Get chunks that need embedding generation"""
        return await self.get_many(
            {
                "project_id": ObjectId(project_id),
                "$or": [
                    {"embedding_vector": {"$exists": False}},
                    {"embedding_vector": None}
                ]
            },
            limit=limit,
            sort=[("created_at", 1)]  # Oldest first
        )
    
    async def update_embedding(self, chunk_id: str, embedding_vector: List[float]) -> Optional[TextChunk]:
        """Update chunk embedding vector"""
        return await self.update_by_id(chunk_id, {"embedding_vector": embedding_vector})
    
    async def add_entity_mention(self, chunk_id: str, entity_id: str) -> Optional[TextChunk]:
        """Add entity mention to chunk"""
        try:
            result = await self.collection.find_one_and_update(
                {"_id": ObjectId(chunk_id)},
                {"$addToSet": {"entities_mentioned": ObjectId(entity_id)}},
                return_document=True
            )
            
            return self._to_model(result) if result else None
            
        except Exception as e:
            logger.error(f"Error adding entity mention to chunk {chunk_id}: {e}")
            raise
    
    async def remove_entity_mention(self, chunk_id: str, entity_id: str) -> Optional[TextChunk]:
        """Remove entity mention from chunk"""
        try:
            result = await self.collection.find_one_and_update(
                {"_id": ObjectId(chunk_id)},
                {"$pull": {"entities_mentioned": ObjectId(entity_id)}},
                return_document=True
            )
            
            return self._to_model(result) if result else None
            
        except Exception as e:
            logger.error(f"Error removing entity mention from chunk {chunk_id}: {e}")
            raise
    
    async def get_chunks_by_entity(self, entity_id: str, skip: int = 0, limit: int = 100) -> List[TextChunk]:
        """Get chunks that mention a specific entity"""
        return await self.get_many(
            {"entities_mentioned": ObjectId(entity_id)},
            skip=skip,
            limit=limit,
            sort=[("created_at", -1)]
        )
    
    async def delete_by_file(self, file_id: str) -> int:
        """Delete all chunks for a file"""
        return await self.delete_by_filter({"file_id": ObjectId(file_id)})
    
    async def delete_by_project(self, project_id: str) -> int:
        """Delete all chunks for a project"""
        return await self.delete_by_filter({"project_id": ObjectId(project_id)})
    
    async def get_project_chunk_stats(self, project_id: str) -> Dict[str, Any]:
        """Get chunk statistics for a project"""
        try:
            pipeline = [
                {"$match": {"project_id": ObjectId(project_id)}},
                {"$group": {
                    "_id": None,
                    "total_chunks": {"$sum": 1},
                    "total_words": {"$sum": "$word_count"},
                    "chunks_with_embeddings": {
                        "$sum": {"$cond": [{"$ne": ["$embedding_vector", None]}, 1, 0]}
                    },
                    "avg_chunk_size": {"$avg": "$word_count"},
                    "files_processed": {"$addToSet": "$file_id"}
                }},
                {"$addFields": {
                    "files_processed": {"$size": "$files_processed"}
                }}
            ]
            
            result = await self.aggregate(pipeline)
            return result[0] if result else {
                "total_chunks": 0,
                "total_words": 0,
                "chunks_with_embeddings": 0,
                "avg_chunk_size": 0,
                "files_processed": 0
            }
            
        except Exception as e:
            logger.error(f"Error getting chunk stats for project {project_id}: {e}")
            return {
                "total_chunks": 0,
                "total_words": 0,
                "chunks_with_embeddings": 0,
                "avg_chunk_size": 0,
                "files_processed": 0
            }

    async def get_chunk_stats_by_project(self, project_id: str) -> Dict[str, Any]:
        """Get chunk statistics for a project"""
        try:
            pipeline = [
                {"$match": {"project_id": ObjectId(project_id)}},
                {"$group": {
                    "_id": None,
                    "total_chunks": {"$sum": 1},
                    "total_words": {"$sum": "$word_count"},
                    "chunks_with_embeddings": {
                        "$sum": {"$cond": [{"$ne": ["$embedding_vector", None]}, 1, 0]}
                    },
                    "avg_chunk_size": {"$avg": "$word_count"}
                }}
            ]
            
            result = await self.aggregate(pipeline)
            return result[0] if result else {
                "total_chunks": 0,
                "total_words": 0,
                "chunks_with_embeddings": 0,
                "avg_chunk_size": 0
            }
            
        except Exception as e:
            logger.error(f"Error getting chunk stats for project {project_id}: {e}")
            return {
                "total_chunks": 0,
                "total_words": 0,
                "chunks_with_embeddings": 0,
                "avg_chunk_size": 0
            }
    
    async def vector_search(self, project_id: str, query_vector: List[float], limit: int = 20) -> List[Dict[str, Any]]:
        """Perform vector similarity search using MongoDB Atlas (requires Atlas)"""
        try:
            # MongoDB Atlas Vector Search pipeline
            pipeline = [
                {
                    "$vectorSearch": {
                        "index": "vector_index",
                        "path": "embedding_vector",
                        "queryVector": query_vector,
                        "numCandidates": limit * 10,
                        "limit": limit,
                        "filter": {"project_id": ObjectId(project_id)}
                    }
                },
                {
                    "$addFields": {
                        "score": {"$meta": "vectorSearchScore"}
                    }
                }
            ]
            
            results = await self.aggregate(pipeline)
            return results
            
        except Exception as e:
            logger.error(f"Error performing vector search: {e}")
            # Fallback to regular search if vector search fails
            return []
    
    async def vector_search_chroma(
        self, 
        project_id: str, 
        query_vector: List[float], 
        limit: int = 20,
        chroma_service=None
    ) -> List[Dict[str, Any]]:
        """
        Perform vector similarity search using ChromaDB
        
        Args:
            project_id: Project ID to search in
            query_vector: Query embedding vector
            limit: Maximum number of results
            chroma_service: ChromaService instance
            
        Returns:
            List of search results with chunk data
        """
        try:
            if chroma_service is None:
                logger.error("ChromaDB service not provided for vector search")
                return []
            
            # Search in ChromaDB
            chroma_results = await chroma_service.search_similar(
                project_id=project_id,
                query_embedding=query_vector,
                n_results=limit
            )
            
            if not chroma_results:
                return []
            
            # Get chunk IDs from ChromaDB results
            chunk_ids = [result['chunk_id'] for result in chroma_results]
            logger.debug(f"ChromaDB returned chunk IDs: {chunk_ids}")
            
            # Fetch full chunk data from MongoDB
            chunks = await self.get_many_by_ids(chunk_ids)
            logger.debug(f"MongoDB returned {len(chunks)} chunks for {len(chunk_ids)} IDs")
            
            # Create a mapping of chunk_id to chunk
            chunk_map = {chunk.id: chunk for chunk in chunks}
            logger.debug(f"Chunk map has {len(chunk_map)} entries")
            
            # Combine ChromaDB scores with MongoDB chunk data
            results = []
            for chroma_result in chroma_results:
                chunk_id = chroma_result['chunk_id']
                if chunk_id in chunk_map:
                    chunk = chunk_map[chunk_id]
                    result = chunk.to_dict()
                    result['score'] = chroma_result['similarity_score']
                    result['distance'] = chroma_result['distance']
                    results.append(result)
            
            logger.info(f"ChromaDB vector search returned {len(results)} results for project {project_id}")
            return results
            
        except Exception as e:
            logger.error(f"Error performing ChromaDB vector search: {e}")
            return []