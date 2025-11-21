"""
Embedding Service

This service handles text embedding generation using SentenceTransformers,
batch processing for performance, and embedding storage and indexing.
"""

import logging
from typing import List, Dict, Optional, Any, Tuple
import numpy as np
from datetime import datetime
import asyncio
from concurrent.futures import ThreadPoolExecutor
import threading

from ..models.text_chunk import TextChunk, TextChunkCreate
from ..repositories.text_chunk_repository import TextChunkRepository

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Service for generating and managing text embeddings"""
    
    def __init__(self, text_chunk_repository: TextChunkRepository, chroma_service=None):
        self.text_chunk_repository = text_chunk_repository
        self.chroma_service = chroma_service
        self._model = None
        self._model_lock = threading.Lock()
        self._executor = ThreadPoolExecutor(max_workers=2)
        
        # Configuration
        self.model_name = "all-MiniLM-L6-v2"
        self.embedding_dimension = 384
        self.batch_size = 32
        self.max_text_length = 512
        
        # Initialize ChromaDB service if not provided
        if self.chroma_service is None:
            try:
                from .chroma_service import ChromaService
                self.chroma_service = ChromaService()
                logger.info("ChromaDB service initialized for vector storage")
            except Exception as e:
                logger.warning(f"ChromaDB service not available: {e}. Vector search will be limited.")
        
    def _load_model(self):
        """Load SentenceTransformers model lazily"""
        if self._model is None:
            with self._model_lock:
                if self._model is None:  # Double-check locking
                    try:
                        from sentence_transformers import SentenceTransformer
                        self._model = SentenceTransformer(self.model_name)
                        logger.info(f"Loaded SentenceTransformer model: {self.model_name}")
                    except ImportError:
                        logger.error("SentenceTransformers not installed. Please install with: pip install sentence-transformers")
                        raise RuntimeError("SentenceTransformers library not available")
                    except Exception as e:
                        logger.error(f"Failed to load embedding model: {e}")
                        raise RuntimeError(f"Failed to load embedding model: {e}")
        return self._model
    
    def _preprocess_text(self, text: str) -> str:
        """Preprocess text for embedding generation"""
        if not text:
            return ""
        
        # Clean and normalize text
        text = text.strip()
        
        # Truncate if too long
        if len(text) > self.max_text_length:
            text = text[:self.max_text_length]
        
        return text
    
    def _generate_embeddings_sync(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings synchronously (runs in thread pool)"""
        try:
            model = self._load_model()
            
            # Preprocess texts
            processed_texts = [self._preprocess_text(text) for text in texts]
            
            # Generate embeddings
            embeddings = model.encode(
                processed_texts,
                batch_size=self.batch_size,
                show_progress_bar=False,
                convert_to_numpy=True
            )
            
            # Convert to list of lists
            return embeddings.tolist()
            
        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")
            raise
    
    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a list of texts
        
        Args:
            texts: List of text strings to embed
            
        Returns:
            List of embedding vectors
        """
        if not texts:
            return []
        
        try:
            # Run embedding generation in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            embeddings = await loop.run_in_executor(
                self._executor, 
                self._generate_embeddings_sync, 
                texts
            )
            
            logger.info(f"Generated embeddings for {len(texts)} texts")
            return embeddings
            
        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")
            raise
    
    async def generate_single_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for a single text
        
        Args:
            text: Text string to embed
            
        Returns:
            Embedding vector
        """
        embeddings = await self.generate_embeddings([text])
        return embeddings[0] if embeddings else []
    
    async def store_text_chunks_with_embeddings(
        self, 
        file_id: str, 
        project_id: str, 
        chunk_data: List[Dict[str, Any]]
    ) -> List[TextChunk]:
        """
        Store text chunks with generated embeddings in both MongoDB and ChromaDB
        
        Args:
            file_id: ID of the source file
            project_id: ID of the project
            chunk_data: List of chunk data dictionaries
            
        Returns:
            List of created TextChunk objects
        """
        try:
            if not chunk_data:
                return []
            
            # Extract texts for embedding generation
            texts = [chunk['content'] for chunk in chunk_data]
            
            # Generate embeddings in batch
            embeddings = await self.generate_embeddings(texts)
            
            # Create TextChunk objects and store in MongoDB
            created_chunks = []
            for i, chunk_info in enumerate(chunk_data):
                embedding = embeddings[i] if i < len(embeddings) else None
                
                chunk = TextChunk(
                    file_id=file_id,
                    project_id=project_id,
                    content=chunk_info['content'],
                    start_position=chunk_info.get('start_position', 0),
                    end_position=chunk_info.get('end_position', len(chunk_info['content'])),
                    chunk_index=chunk_info.get('chunk_index', i),
                    word_count=chunk_info.get('word_count', len(chunk_info['content'].split())),
                    embedding_vector=embedding,
                    entities_mentioned=chunk_info.get('entities_mentioned', []),
                    created_at=datetime.utcnow()
                )
                
                # Store chunk in MongoDB
                created_chunk = await self.text_chunk_repository.create(chunk)
                created_chunks.append(created_chunk)
            
            # Store embeddings in ChromaDB for fast vector search
            if self.chroma_service and created_chunks:
                try:
                    chunk_ids = [chunk.id for chunk in created_chunks]
                    chunk_embeddings = [chunk.embedding_vector for chunk in created_chunks if chunk.embedding_vector]
                    chunk_texts = [chunk.content for chunk in created_chunks]
                    chunk_metadatas = [
                        {
                            "file_id": chunk.file_id,
                            "chunk_index": chunk.chunk_index,
                            "word_count": chunk.word_count
                        }
                        for chunk in created_chunks
                    ]
                    
                    await self.chroma_service.add_embeddings(
                        project_id=project_id,
                        chunk_ids=chunk_ids,
                        embeddings=chunk_embeddings,
                        documents=chunk_texts,
                        metadatas=chunk_metadatas
                    )
                    logger.info(f"Stored {len(chunk_ids)} embeddings in ChromaDB for project {project_id}")
                except Exception as e:
                    logger.error(f"Error storing embeddings in ChromaDB: {e}. Continuing with MongoDB storage only.")
            
            logger.info(f"Stored {len(created_chunks)} text chunks with embeddings")
            return created_chunks
            
        except Exception as e:
            logger.error(f"Error storing text chunks with embeddings: {e}")
            raise
    
    async def update_chunk_embedding(self, chunk_id: str, text: Optional[str] = None) -> Optional[TextChunk]:
        """
        Update embedding for a specific text chunk
        
        Args:
            chunk_id: ID of the text chunk
            text: Optional text to use (if None, uses chunk content)
            
        Returns:
            Updated TextChunk object
        """
        try:
            # Get existing chunk
            chunk = await self.text_chunk_repository.get_by_id(chunk_id)
            if not chunk:
                logger.warning(f"Chunk {chunk_id} not found")
                return None
            
            # Use provided text or chunk content
            text_to_embed = text if text is not None else chunk.content
            
            # Generate new embedding
            embedding = await self.generate_single_embedding(text_to_embed)
            
            # Update chunk
            updated_chunk = await self.text_chunk_repository.update_embedding(chunk_id, embedding)
            
            logger.info(f"Updated embedding for chunk {chunk_id}")
            return updated_chunk
            
        except Exception as e:
            logger.error(f"Error updating chunk embedding: {e}")
            raise
    
    async def batch_generate_missing_embeddings(
        self, 
        project_id: str, 
        batch_size: Optional[int] = None
    ) -> int:
        """
        Generate embeddings for chunks that don't have them
        
        Args:
            project_id: ID of the project
            batch_size: Number of chunks to process at once
            
        Returns:
            Number of embeddings generated
        """
        try:
            batch_size = batch_size or self.batch_size
            
            # Get chunks without embeddings
            chunks_without_embeddings = await self.text_chunk_repository.get_chunks_without_embeddings(
                project_id, limit=batch_size
            )
            
            if not chunks_without_embeddings:
                logger.info("No chunks found without embeddings")
                return 0
            
            # Extract texts and generate embeddings
            texts = [chunk.content for chunk in chunks_without_embeddings]
            embeddings = await self.generate_embeddings(texts)
            
            # Update chunks with embeddings
            updated_count = 0
            for i, chunk in enumerate(chunks_without_embeddings):
                if i < len(embeddings):
                    await self.text_chunk_repository.update_embedding(chunk.id, embeddings[i])
                    updated_count += 1
            
            logger.info(f"Generated embeddings for {updated_count} chunks")
            return updated_count
            
        except Exception as e:
            logger.error(f"Error batch generating embeddings: {e}")
            raise
    
    async def semantic_search(
        self, 
        project_id: str, 
        query: str, 
        limit: int = 20,
        min_similarity: float = 0.1
    ) -> List[Dict[str, Any]]:
        """
        Perform semantic search using embeddings
        
        Args:
            project_id: ID of the project to search in
            query: Search query text
            limit: Maximum number of results
            min_similarity: Minimum similarity threshold
            
        Returns:
            List of search results with similarity scores
        """
        try:
            # Generate query embedding
            query_embedding = await self.generate_single_embedding(query)
            if not query_embedding:
                return []
            
            # Perform vector search using ChromaDB
            if not self.chroma_service:
                logger.error("ChromaDB service not available for semantic search")
                return []
            
            results = await self.text_chunk_repository.vector_search_chroma(
                project_id=project_id,
                query_vector=query_embedding,
                limit=limit,
                chroma_service=self.chroma_service
            )
            
            # Filter by minimum similarity and format results
            filtered_results = []
            for result in results:
                similarity_score = result.get('score', 0.0)
                
                if similarity_score >= min_similarity:
                    chunk_data = {
                        'chunk_id': str(result['_id']),
                        'file_id': str(result['file_id']),
                        'content': result['content'],
                        'similarity_score': similarity_score,
                        'start_position': result.get('start_position', 0),
                        'end_position': result.get('end_position', 0),
                        'entities_mentioned': [str(eid) for eid in result.get('entities_mentioned', [])]
                    }
                    filtered_results.append(chunk_data)
            
            logger.info(f"Semantic search returned {len(filtered_results)} results for query: {query[:50]}...")
            return filtered_results
            
        except Exception as e:
            logger.error(f"Error performing semantic search: {e}")
            return []
    
    async def find_similar_chunks(
        self, 
        chunk_id: str, 
        limit: int = 10,
        min_similarity: float = 0.3
    ) -> List[Dict[str, Any]]:
        """
        Find chunks similar to a given chunk
        
        Args:
            chunk_id: ID of the reference chunk
            limit: Maximum number of similar chunks to return
            min_similarity: Minimum similarity threshold
            
        Returns:
            List of similar chunks with similarity scores
        """
        try:
            # Get reference chunk
            reference_chunk = await self.text_chunk_repository.get_by_id(chunk_id)
            if not reference_chunk or not reference_chunk.embedding_vector:
                return []
            
            # Perform vector search using reference embedding
            results = await self.text_chunk_repository.vector_search(
                reference_chunk.project_id, 
                reference_chunk.embedding_vector, 
                limit + 1  # +1 to account for the reference chunk itself
            )
            
            # Filter out the reference chunk and apply similarity threshold
            similar_chunks = []
            for result in results:
                if str(result['_id']) != chunk_id:  # Exclude reference chunk
                    similarity_score = result.get('score', 0.0)
                    
                    if similarity_score >= min_similarity:
                        chunk_data = {
                            'chunk_id': str(result['_id']),
                            'file_id': str(result['file_id']),
                            'content': result['content'],
                            'similarity_score': similarity_score,
                            'start_position': result.get('start_position', 0),
                            'end_position': result.get('end_position', 0)
                        }
                        similar_chunks.append(chunk_data)
            
            # Limit results
            similar_chunks = similar_chunks[:limit]
            
            logger.info(f"Found {len(similar_chunks)} similar chunks for chunk {chunk_id}")
            return similar_chunks
            
        except Exception as e:
            logger.error(f"Error finding similar chunks: {e}")
            return []
    
    def calculate_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """
        Calculate cosine similarity between two embeddings
        
        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector
            
        Returns:
            Cosine similarity score (0.0 to 1.0)
        """
        try:
            if not embedding1 or not embedding2:
                return 0.0
            
            # Convert to numpy arrays
            vec1 = np.array(embedding1)
            vec2 = np.array(embedding2)
            
            # Calculate cosine similarity
            dot_product = np.dot(vec1, vec2)
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            similarity = dot_product / (norm1 * norm2)
            
            # Normalize to 0-1 range (cosine similarity is -1 to 1)
            normalized_similarity = (similarity + 1) / 2
            
            return float(normalized_similarity)
            
        except Exception as e:
            logger.error(f"Error calculating similarity: {e}")
            return 0.0
    
    async def get_embedding_statistics(self, project_id: str) -> Dict[str, Any]:
        """
        Get embedding statistics for a project
        
        Args:
            project_id: ID of the project
            
        Returns:
            Dictionary containing embedding statistics
        """
        try:
            # Get chunk statistics
            chunk_stats = await self.text_chunk_repository.get_chunk_stats_by_project(project_id)
            
            # Calculate embedding coverage
            total_chunks = chunk_stats.get('total_chunks', 0)
            chunks_with_embeddings = chunk_stats.get('chunks_with_embeddings', 0)
            
            embedding_coverage = 0.0
            if total_chunks > 0:
                embedding_coverage = chunks_with_embeddings / total_chunks
            
            stats = {
                'total_chunks': total_chunks,
                'chunks_with_embeddings': chunks_with_embeddings,
                'chunks_without_embeddings': total_chunks - chunks_with_embeddings,
                'embedding_coverage': embedding_coverage,
                'embedding_model': self.model_name,
                'embedding_dimension': self.embedding_dimension,
                'total_words': chunk_stats.get('total_words', 0),
                'avg_chunk_size': chunk_stats.get('avg_chunk_size', 0)
            }
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting embedding statistics: {e}")
            return {
                'total_chunks': 0,
                'chunks_with_embeddings': 0,
                'chunks_without_embeddings': 0,
                'embedding_coverage': 0.0,
                'embedding_model': self.model_name,
                'embedding_dimension': self.embedding_dimension,
                'total_words': 0,
                'avg_chunk_size': 0
            }
    
    async def reindex_project_embeddings(self, project_id: str) -> Dict[str, int]:
        """
        Regenerate all embeddings for a project
        
        Args:
            project_id: ID of the project
            
        Returns:
            Dictionary with reindexing statistics
        """
        try:
            logger.info(f"Starting embedding reindexing for project {project_id}")
            
            # Get all chunks for the project
            all_chunks = await self.text_chunk_repository.find_by_project(project_id)
            
            if not all_chunks:
                return {'processed': 0, 'updated': 0, 'errors': 0}
            
            processed = 0
            updated = 0
            errors = 0
            
            # Process chunks in batches
            for i in range(0, len(all_chunks), self.batch_size):
                batch = all_chunks[i:i + self.batch_size]
                
                try:
                    # Extract texts and generate embeddings
                    texts = [chunk.content for chunk in batch]
                    embeddings = await self.generate_embeddings(texts)
                    
                    # Update chunks with new embeddings
                    for j, chunk in enumerate(batch):
                        if j < len(embeddings):
                            await self.text_chunk_repository.update_embedding(
                                chunk.id, embeddings[j]
                            )
                            updated += 1
                        processed += 1
                        
                except Exception as e:
                    logger.error(f"Error processing batch {i//self.batch_size + 1}: {e}")
                    errors += len(batch)
                    processed += len(batch)
            
            logger.info(f"Embedding reindexing completed: {updated} updated, {errors} errors")
            
            return {
                'processed': processed,
                'updated': updated,
                'errors': errors
            }
            
        except Exception as e:
            logger.error(f"Error reindexing project embeddings: {e}")
            raise
    
    async def find_similar_chunks(
        self,
        query_text: str,
        project_id: str = None,
        limit: int = 20,
        similarity_threshold: float = 0.1
    ) -> List[Tuple[TextChunk, float]]:
        """
        Find chunks similar to query text (for backward compatibility)
        
        Args:
            query_text: Query text to find similar chunks for
            project_id: Project ID to limit search scope
            limit: Maximum number of results
            similarity_threshold: Minimum similarity score
            
        Returns:
            List of tuples (TextChunk, similarity_score)
        """
        try:
            # Generate query embedding
            query_embedding = await self.generate_single_embedding(query_text)
            if not query_embedding:
                return []
            
            # Perform vector search
            results = await self.text_chunk_repository.vector_search(
                project_id, query_embedding, limit
            )
            
            # Convert to TextChunk objects and filter by similarity
            similar_chunks = []
            for result in results:
                similarity_score = result.get('score', 0.0)
                
                if similarity_score >= similarity_threshold:
                    # Convert result to TextChunk
                    chunk = TextChunk(
                        id=str(result['_id']),
                        file_id=str(result['file_id']),
                        project_id=str(result['project_id']),
                        content=result['content'],
                        start_position=result.get('start_position', 0),
                        end_position=result.get('end_position', 0),
                        chunk_index=result.get('chunk_index', 0),
                        word_count=result.get('word_count', 0),
                        embedding_vector=result.get('embedding_vector'),
                        entities_mentioned=result.get('entities_mentioned', []),
                        created_at=result.get('created_at')
                    )
                    
                    similar_chunks.append((chunk, similarity_score))
            
            return similar_chunks
            
        except Exception as e:
            logger.error(f"Error finding similar chunks: {e}")
            return []
    
    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for single text (alias for generate_single_embedding)"""
        return await self.generate_single_embedding(text)
    
    async def get_embedding_stats(self) -> Dict[str, Any]:
        """Get embedding system statistics"""
        try:
            # Get total chunks with embeddings across all projects
            total_chunks = await self.text_chunk_repository.count_all()
            
            # Count chunks with embeddings
            chunks_with_embeddings = await self.text_chunk_repository.collection.count_documents({
                "embedding_vector": {"$exists": True, "$ne": None}
            })
            
            return {
                "total_chunks_with_embeddings": chunks_with_embeddings,
                "model_info": {
                    "model_name": self.model_name,
                    "embedding_dimension": self.embedding_dimension,
                    "max_text_length": self.max_text_length
                },
                "cache_ttl_seconds": 3600  # Default cache TTL
            }
            
        except Exception as e:
            logger.error(f"Error getting embedding stats: {e}")
            return {
                "total_chunks_with_embeddings": 0,
                "model_info": {
                    "model_name": self.model_name,
                    "embedding_dimension": self.embedding_dimension,
                    "max_text_length": self.max_text_length
                },
                "cache_ttl_seconds": 3600
            }
    
    async def cleanup_embeddings(self, project_id: str) -> int:
        """Clean up embeddings for a project"""
        try:
            # Delete all text chunks for the project
            deleted_count = await self.text_chunk_repository.delete_by_project(project_id)
            logger.info(f"Cleaned up {deleted_count} text chunks for project {project_id}")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error cleaning up embeddings for project {project_id}: {e}")
            return 0
    
    @property
    def _model_name(self) -> str:
        """Get model name for backward compatibility"""
        return self.model_name

    def __del__(self):
        """Cleanup resources"""
        if hasattr(self, '_executor'):
            self._executor.shutdown(wait=False)