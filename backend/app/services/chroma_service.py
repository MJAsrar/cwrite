"""
ChromaDB Service for Vector Storage and Similarity Search

This service handles all vector storage and retrieval operations using ChromaDB,
providing persistent local vector search capabilities.
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
import chromadb
from chromadb.config import Settings
from datetime import datetime
import os

logger = logging.getLogger(__name__)


class ChromaService:
    """Service for managing vector embeddings with ChromaDB"""
    
    def __init__(self, persist_directory: str = "./chroma_db"):
        """
        Initialize ChromaDB service with persistent storage
        
        Args:
            persist_directory: Directory to persist ChromaDB data
        """
        self.persist_directory = persist_directory
        self._client = None
        self._collections = {}
        
        # Ensure the persist directory exists
        os.makedirs(persist_directory, exist_ok=True)
        
        logger.info(f"ChromaDB service initialized with persist directory: {persist_directory}")
    
    def _get_client(self) -> chromadb.Client:
        """Get or create ChromaDB client with persistent storage"""
        if self._client is None:
            try:
                self._client = chromadb.PersistentClient(
                    path=self.persist_directory,
                    settings=Settings(
                        anonymized_telemetry=False,
                        allow_reset=True
                    )
                )
                logger.info("ChromaDB persistent client created successfully")
            except Exception as e:
                logger.error(f"Error creating ChromaDB client: {e}")
                raise
        
        return self._client
    
    def get_or_create_collection(self, project_id: str) -> chromadb.Collection:
        """
        Get or create a collection for a specific project
        
        Args:
            project_id: Project ID to create collection for
            
        Returns:
            ChromaDB collection
        """
        collection_name = f"project_{project_id}"
        
        if collection_name in self._collections:
            return self._collections[collection_name]
        
        try:
            client = self._get_client()
            
            # Get or create collection
            collection = client.get_or_create_collection(
                name=collection_name,
                metadata={
                    "project_id": project_id,
                    "created_at": datetime.utcnow().isoformat()
                }
            )
            
            self._collections[collection_name] = collection
            logger.info(f"Collection '{collection_name}' ready with {collection.count()} vectors")
            
            return collection
            
        except Exception as e:
            logger.error(f"Error getting/creating collection for project {project_id}: {e}")
            raise
    
    async def add_embeddings(
        self,
        project_id: str,
        chunk_ids: List[str],
        embeddings: List[List[float]],
        documents: List[str],
        metadatas: Optional[List[Dict[str, Any]]] = None
    ) -> bool:
        """
        Add embeddings to ChromaDB for a project
        
        Args:
            project_id: Project ID
            chunk_ids: List of chunk IDs (used as ChromaDB IDs)
            embeddings: List of embedding vectors
            documents: List of text content (for reference)
            metadatas: Optional list of metadata dicts
            
        Returns:
            True if successful, False otherwise
        """
        try:
            collection = self.get_or_create_collection(project_id)
            
            # Prepare metadata
            if metadatas is None:
                metadatas = [{"chunk_id": cid} for cid in chunk_ids]
            else:
                # Ensure chunk_id is in metadata
                for i, metadata in enumerate(metadatas):
                    metadata["chunk_id"] = chunk_ids[i]
            
            # Add to ChromaDB
            collection.add(
                ids=chunk_ids,
                embeddings=embeddings,
                documents=documents,
                metadatas=metadatas
            )
            
            logger.info(f"Added {len(chunk_ids)} embeddings to project {project_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error adding embeddings to ChromaDB: {e}")
            return False
    
    async def search_similar(
        self,
        project_id: str,
        query_embedding: List[float],
        n_results: int = 10,
        where: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for similar vectors in ChromaDB
        
        Args:
            project_id: Project ID to search in
            query_embedding: Query embedding vector
            n_results: Number of results to return
            where: Optional metadata filter
            
        Returns:
            List of search results with chunk_id, distance, document, metadata
        """
        try:
            collection = self.get_or_create_collection(project_id)
            
            # Check if collection has any data
            if collection.count() == 0:
                logger.info(f"No embeddings found in collection for project {project_id}")
                return []
            
            # Perform similarity search
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                where=where
            )
            
            # Format results
            formatted_results = []
            if results and results['ids'] and len(results['ids']) > 0:
                ids = results['ids'][0]
                distances = results['distances'][0]
                documents = results['documents'][0] if results.get('documents') else []
                metadatas = results['metadatas'][0] if results.get('metadatas') else []
                
                for i in range(len(ids)):
                    # Convert distance to similarity score (ChromaDB uses L2 distance)
                    # Lower distance = higher similarity
                    # Convert to 0-1 scale where 1 is most similar
                    distance = distances[i]
                    similarity = 1 / (1 + distance)  # Simple conversion
                    
                    result = {
                        'chunk_id': ids[i],
                        'distance': distance,
                        'similarity_score': similarity,
                        'document': documents[i] if i < len(documents) else None,
                        'metadata': metadatas[i] if i < len(metadatas) else {}
                    }
                    formatted_results.append(result)
            
            logger.info(f"Found {len(formatted_results)} similar vectors for project {project_id}")
            return formatted_results
            
        except Exception as e:
            logger.error(f"Error searching similar vectors in ChromaDB: {e}")
            return []
    
    async def delete_embeddings(
        self,
        project_id: str,
        chunk_ids: List[str]
    ) -> bool:
        """
        Delete specific embeddings from ChromaDB
        
        Args:
            project_id: Project ID
            chunk_ids: List of chunk IDs to delete
            
        Returns:
            True if successful, False otherwise
        """
        try:
            collection = self.get_or_create_collection(project_id)
            
            collection.delete(ids=chunk_ids)
            
            logger.info(f"Deleted {len(chunk_ids)} embeddings from project {project_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting embeddings from ChromaDB: {e}")
            return False
    
    async def delete_project_collection(self, project_id: str) -> bool:
        """
        Delete entire collection for a project
        
        Args:
            project_id: Project ID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            collection_name = f"project_{project_id}"
            client = self._get_client()
            
            # Delete collection
            client.delete_collection(name=collection_name)
            
            # Remove from cache
            if collection_name in self._collections:
                del self._collections[collection_name]
            
            logger.info(f"Deleted ChromaDB collection for project {project_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting ChromaDB collection for project {project_id}: {e}")
            return False
    
    async def get_collection_stats(self, project_id: str) -> Dict[str, Any]:
        """
        Get statistics for a project's collection
        
        Args:
            project_id: Project ID
            
        Returns:
            Dictionary with collection statistics
        """
        try:
            collection = self.get_or_create_collection(project_id)
            
            count = collection.count()
            
            stats = {
                "project_id": project_id,
                "vector_count": count,
                "collection_name": f"project_{project_id}",
                "has_data": count > 0
            }
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting collection stats for project {project_id}: {e}")
            return {
                "project_id": project_id,
                "vector_count": 0,
                "has_data": False,
                "error": str(e)
            }
    
    async def update_embedding(
        self,
        project_id: str,
        chunk_id: str,
        embedding: List[float],
        document: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Update an existing embedding
        
        Args:
            project_id: Project ID
            chunk_id: Chunk ID to update
            embedding: New embedding vector
            document: New document text
            metadata: New metadata
            
        Returns:
            True if successful, False otherwise
        """
        try:
            collection = self.get_or_create_collection(project_id)
            
            # Prepare metadata
            if metadata is None:
                metadata = {"chunk_id": chunk_id}
            else:
                metadata["chunk_id"] = chunk_id
            
            # Update in ChromaDB (upsert)
            collection.upsert(
                ids=[chunk_id],
                embeddings=[embedding],
                documents=[document],
                metadatas=[metadata]
            )
            
            logger.info(f"Updated embedding for chunk {chunk_id} in project {project_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating embedding in ChromaDB: {e}")
            return False
    
    def get_all_collections(self) -> List[str]:
        """
        Get list of all collection names
        
        Returns:
            List of collection names
        """
        try:
            client = self._get_client()
            collections = client.list_collections()
            return [col.name for col in collections]
            
        except Exception as e:
            logger.error(f"Error listing ChromaDB collections: {e}")
            return []
    
    def reset_database(self) -> bool:
        """
        Reset the entire ChromaDB database (USE WITH CAUTION!)
        
        Returns:
            True if successful, False otherwise
        """
        try:
            client = self._get_client()
            client.reset()
            self._collections = {}
            
            logger.warning("ChromaDB database has been reset!")
            return True
            
        except Exception as e:
            logger.error(f"Error resetting ChromaDB: {e}")
            return False




