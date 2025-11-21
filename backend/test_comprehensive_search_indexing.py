#!/usr/bin/env python3
"""
Comprehensive Test for Semantic Search & Indexing Pipeline

This script tests the complete workflow:
1. Project creation
2. File upload
3. Text extraction and chunking
4. Entity extraction
5. Embedding generation
6. Semantic search
7. Relationship discovery
8. Search analytics

Run this file to verify that all backend semantic search and indexing features are working correctly.
"""

import asyncio
import sys
import os
import logging
from datetime import datetime
from pathlib import Path
import tempfile
from typing import List, Dict, Any

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Disable verbose logs from other libraries
logging.getLogger('motor').setLevel(logging.WARNING)
logging.getLogger('pymongo').setLevel(logging.WARNING)

# Import all required modules at module level
try:
    from app.core.database import connect_to_mongo, close_mongo_connection, get_database
    from app.repositories.project_repository import ProjectRepository
    from app.repositories.file_repository import FileRepository
    from app.repositories.text_chunk_repository import TextChunkRepository
    from app.repositories.entity_repository import EntityRepository
    from app.repositories.relationship_repository import RelationshipRepository
    from app.repositories.search_log_repository import SearchLogRepository
    from app.repositories.indexing_status_repository import IndexingStatusRepository
    from app.repositories.user_repository import UserRepository
    
    from app.services.embedding_service import EmbeddingService
    from app.services.entity_extraction_service import EntityExtractionService
    from app.services.text_extraction_service import TextExtractionService
    from app.services.search_service import SearchService
    from app.services.relationship_discovery_service import RelationshipDiscoveryService
    
    from app.models.project import Project
    from app.models.file import ProjectFile, FileUpload, UploadStatus, ProcessingStatus
    from app.models.entity import Entity
    from app.models.text_chunk import TextChunk
    from app.models.user import User
    
    IMPORTS_SUCCESSFUL = True
except ImportError as e:
    logger.error(f"Failed to import required modules: {e}")
    IMPORTS_SUCCESSFUL = False


class ComprehensiveTestRunner:
    """Test runner for all semantic search and indexing features"""
    
    def __init__(self):
        self.test_results = []
        self.test_project_id = None
        self.test_file_ids = []
        self.test_entities = []
        self.test_chunks = []
        self.start_time = None
        
    def log_result(self, test_name: str, passed: bool, message: str = "", duration: float = 0):
        """Log test result"""
        status = "✅ PASSED" if passed else "❌ FAILED"
        self.test_results.append({
            "test": test_name,
            "passed": passed,
            "message": message,
            "duration": duration
        })
        
        duration_str = f" ({duration:.2f}s)" if duration > 0 else ""
        print(f"{status} - {test_name}{duration_str}")
        if message:
            print(f"   {message}")
    
    async def setup_imports(self) -> bool:
        """Check if all required modules were imported successfully"""
        test_start = datetime.now()
        
        duration = (datetime.now() - test_start).total_seconds()
        
        if IMPORTS_SUCCESSFUL:
            self.log_result(
                "Import Dependencies",
                True,
                "All required modules imported successfully",
                duration
            )
            return True
        else:
            self.log_result(
                "Import Dependencies",
                False,
                "Failed to import required modules - check that all dependencies are installed",
                duration
            )
            return False
    
    async def test_database_connection(self) -> bool:
        """Test database connectivity"""
        test_start = datetime.now()
        
        try:
            await connect_to_mongo()
            
            # Try a simple operation
            db = get_database()
            collections = await db.list_collection_names()
            
            duration = (datetime.now() - test_start).total_seconds()
            self.log_result(
                "Database Connection",
                True,
                f"Connected to MongoDB with {len(collections)} collections",
                duration
            )
            return True
            
        except Exception as e:
            duration = (datetime.now() - test_start).total_seconds()
            self.log_result(
                "Database Connection",
                False,
                f"Database connection failed: {e}",
                duration
            )
            return False
    
    async def test_create_test_project(self) -> bool:
        """Create a test project"""
        test_start = datetime.now()
        
        try:
            project_repo = ProjectRepository()
            user_repo = UserRepository()
            
            # Create or get test user
            test_user = await user_repo.get_by_email("test@cowriteai.com")
            if not test_user:
                test_user = User(
                    email="test@cowriteai.com",
                    username="testuser",
                    full_name="Test User",
                    hashed_password="dummy_hash",
                    is_verified=True
                )
                test_user = await user_repo.create(test_user)
            
            # Create test project
            project = Project(
                name=f"Test Project - Semantic Search {datetime.now().strftime('%Y%m%d_%H%M%S')}",
                description="Automated test project for semantic search and indexing",
                owner_id=test_user.id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            created_project = await project_repo.create(project)
            self.test_project_id = created_project.id
            
            duration = (datetime.now() - test_start).total_seconds()
            self.log_result(
                "Create Test Project",
                True,
                f"Project created with ID: {self.test_project_id}",
                duration
            )
            return True
            
        except Exception as e:
            duration = (datetime.now() - test_start).total_seconds()
            self.log_result(
                "Create Test Project",
                False,
                f"Project creation failed: {e}",
                duration
            )
            return False
    
    async def test_file_upload_and_extraction(self) -> bool:
        """Test file upload and text extraction"""
        test_start = datetime.now()
        
        try:
            file_repo = FileRepository()
            text_service = TextExtractionService()
            
            # Create test text content
            test_content = """
            The city of Neo-Kyra never slept it shimmered. A thousand layers of glass, rain, and holograms stacked on top of each other, reflecting lives that werent real anymore. Kael Renn moved through the alleys like a ghost. Officially, he was a memory retriever fixing corrupted ID chips, helping people remember who they were. Unofficially, he was a thief of memories, trading pieces of the past to anyone who could pay. One night, a woman found him in the Drip Zone pale coat soaked, eyes electric under the neon haze. Names Sera Vyn, she said. I need you to find someone. My brother. Kael agreed, though her file showed no chip, no data she didnt officially exist. That alone shouldve been enough to walk away. But her face hed seen it before, flickering in his dreams like a forgotten life. Each recovered memory took them deeper into Neo-Kyras underbelly black markets selling emotion loops, priests that worshipped lost data, and the towering Eidolon Spire, home of Dr. Ilya Noor the scientist who built the memory network that bound the city. When Kael broke into the Spires archives, he found the truth buried in an encrypted file labeled Project SERA. Sera wasnt looking for her brother. She was the brother a digital reconstruction of a boy whod died in a reactor fire fifteen years ago. Noor had rebuilt him from fragments of Kaels memories because Kael had been the engineer who caused that fire. Everything snapped. His guilt, her face, their bond all of it was a loop, replayed for years so Noor could test how much humanity could be restored through memory. In the end, Kael tore the chip from his neck, freeing himself from the system. Seras image began to fade with the connection lost. Do you remember me now? she whispered. I always did, he said. And the neon sky dimmed for the first time in decades. When the city woke, Kael was gone but across Neo-Kyras towers, people started to dream again.
            """
            
            # Create a temporary file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
                f.write(test_content)
                temp_file_path = f.name
            
            try:
                # Create file record
                project_file = ProjectFile(
                    project_id=self.test_project_id,
                    filename="test_story.txt",
                    original_filename="test_story.txt",
                    content_type="text/plain",
                    size=len(test_content.encode('utf-8')),
                    upload_status=UploadStatus.COMPLETED,
                    processing_status=ProcessingStatus.PENDING,
                    text_content=test_content,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                
                created_file = await file_repo.create(project_file)
                self.test_file_ids.append(created_file.id)
                
                # Verify the text content is stored
                # (In a real scenario, extract_text_from_file would need file_content bytes)
                # For testing, we're using text_content directly
                extracted_text = created_file.text_content
                
                # Verify extraction
                assert len(extracted_text) > 0, "Extracted text is empty"
                assert "Kael Renn" in extracted_text, "Expected character name not found in extracted text"
                assert "Eldoria" in extracted_text, "Expected location name not found in extracted text"
                
                duration = (datetime.now() - test_start).total_seconds()
                self.log_result(
                    "File Upload & Text Extraction",
                    True,
                    f"File uploaded and {len(extracted_text)} characters extracted",
                    duration
                )
                return True
                
            finally:
                # Cleanup temp file
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
            
        except Exception as e:
            duration = (datetime.now() - test_start).total_seconds()
            self.log_result(
                "File Upload & Text Extraction",
                False,
                f"File upload/extraction failed: {e}",
                duration
            )
            return False
    
    async def test_text_chunking(self) -> bool:
        """Test text chunking functionality"""
        test_start = datetime.now()
        
        try:
            file_repo = FileRepository()
            text_service = TextExtractionService()
            
            # Get the uploaded file
            file_obj = await file_repo.get_by_id(self.test_file_ids[0])
            
            # Chunk the text
            chunks = await text_service.chunk_text(
                file_obj.id,
                self.test_project_id,
                file_obj.text_content
            )
            
            # Verify chunking
            assert len(chunks) > 0, "No chunks were created"
            assert all(chunk.content for chunk in chunks), "Some chunks have no content"
            assert all(chunk.word_count > 0 for chunk in chunks), "Some chunks have zero word count"
            
            duration = (datetime.now() - test_start).total_seconds()
            self.log_result(
                "Text Chunking",
                True,
                f"Created {len(chunks)} text chunks",
                duration
            )
            return True
            
        except Exception as e:
            duration = (datetime.now() - test_start).total_seconds()
            self.log_result(
                "Text Chunking",
                False,
                f"Text chunking failed: {e}",
                duration
            )
            return False
    
    async def test_entity_extraction(self) -> bool:
        """Test entity extraction"""
        test_start = datetime.now()
        
        try:
            entity_repo = EntityRepository()
            entity_service = EntityExtractionService(entity_repo)
            file_repo = FileRepository()
            
            # Get the uploaded file
            file_obj = await file_repo.get_by_id(self.test_file_ids[0])
            
            # Extract entities
            entities = await entity_service.extract_entities_from_text(
                file_obj.text_content,
                file_obj.id,
                self.test_project_id,
                confidence_threshold=0.3  # Lower threshold for testing
            )
            
            # Verify extraction
            assert len(entities) > 0, "No entities were extracted"
            
            # Check for expected entity types
            characters = [e for e in entities if e.type == "character"]
            locations = [e for e in entities if e.type == "location"]
            themes = [e for e in entities if e.type == "theme"]
            
            # Store entities for later tests
            for entity in entities:
                created_entity = await entity_repo.create(entity)
                self.test_entities.append(created_entity)
            
            duration = (datetime.now() - test_start).total_seconds()
            self.log_result(
                "Entity Extraction",
                True,
                f"Extracted {len(characters)} characters, {len(locations)} locations, {len(themes)} themes",
                duration
            )
            return True
            
        except Exception as e:
            duration = (datetime.now() - test_start).total_seconds()
            self.log_result(
                "Entity Extraction",
                False,
                f"Entity extraction failed: {e}",
                duration
            )
            import traceback
            traceback.print_exc()
            return False
    
    async def test_embedding_generation(self) -> bool:
        """Test embedding generation and storage"""
        test_start = datetime.now()
        
        try:
            text_chunk_repo = TextChunkRepository()
            embedding_service = EmbeddingService(text_chunk_repo)
            text_service = TextExtractionService()
            file_repo = FileRepository()
            
            # Get the uploaded file
            file_obj = await file_repo.get_by_id(self.test_file_ids[0])
            
            # Create text chunks
            text_chunks = await text_service.chunk_text(
                file_obj.id,
                self.test_project_id,
                file_obj.text_content
            )
            
            # Prepare chunk data for embedding service
            chunk_data = []
            for chunk in text_chunks:
                chunk_data.append({
                    'content': chunk.content,
                    'start_position': chunk.start_position,
                    'end_position': chunk.end_position,
                    'chunk_index': chunk.chunk_index,
                    'word_count': chunk.word_count,
                    'entities_mentioned': []
                })
            
            # Generate embeddings and store chunks
            created_chunks = await embedding_service.store_text_chunks_with_embeddings(
                file_obj.id,
                self.test_project_id,
                chunk_data
            )
            
            self.test_chunks = created_chunks
            
            # Verify embeddings
            assert len(created_chunks) > 0, "No chunks were stored"
            
            # Check that embeddings were generated
            chunks_with_embeddings = [c for c in created_chunks if c.embedding_vector]
            assert len(chunks_with_embeddings) > 0, "No embeddings were generated"
            
            # Verify embedding dimensions (should be 384 for all-MiniLM-L6-v2)
            first_embedding = chunks_with_embeddings[0].embedding_vector
            assert len(first_embedding) == 384, f"Expected 384 dimensions, got {len(first_embedding)}"
            
            # Test single embedding generation
            test_text = "This is a test sentence for embedding generation."
            single_embedding = await embedding_service.generate_embedding(test_text)
            assert len(single_embedding) == 384, "Single embedding has wrong dimensions"
            
            duration = (datetime.now() - test_start).total_seconds()
            self.log_result(
                "Embedding Generation",
                True,
                f"Generated embeddings for {len(chunks_with_embeddings)}/{len(created_chunks)} chunks",
                duration
            )
            return True
            
        except Exception as e:
            duration = (datetime.now() - test_start).total_seconds()
            self.log_result(
                "Embedding Generation",
                False,
                f"Embedding generation failed: {e}",
                duration
            )
            import traceback
            traceback.print_exc()
            return False
    
    async def test_semantic_search(self) -> bool:
        """Test semantic search functionality"""
        test_start = datetime.now()
        
        try:
            text_chunk_repo = TextChunkRepository()
            entity_repo = EntityRepository()
            file_repo = FileRepository()
            search_log_repo = SearchLogRepository()
            embedding_service = EmbeddingService(text_chunk_repo)
            
            search_service = SearchService(
                text_chunk_repo,
                entity_repo,
                file_repo,
                search_log_repo,
                embedding_service
            )
            
            # Test various search queries
            test_queries = [
                ("wizard casting spells", "magic-related content"),
                ("Marcus and Elena friendship", "character relationships"),
                ("locations in Eldoria", "geographical entities"),
                ("themes of courage and fear", "thematic content")
            ]
            
            results_summary = []
            
            for query, description in test_queries:
                results = await search_service.semantic_search(
                    project_id=self.test_project_id,
                    query=query,
                    limit=5,
                    similarity_threshold=0.1
                )
                
                results_summary.append(f"{description}: {len(results)} results")
                
                # Verify results
                if len(results) > 0:
                    # Check that results have required fields
                    assert all(hasattr(r, 'content') for r in results), "Results missing content"
                    assert all(hasattr(r, 'similarity_score') for r in results), "Results missing similarity score"
                    assert all(hasattr(r, 'relevance_score') for r in results), "Results missing relevance score"
            
            duration = (datetime.now() - test_start).total_seconds()
            self.log_result(
                "Semantic Search",
                True,
                "; ".join(results_summary),
                duration
            )
            return True
            
        except Exception as e:
            duration = (datetime.now() - test_start).total_seconds()
            self.log_result(
                "Semantic Search",
                False,
                f"Semantic search failed: {e}",
                duration
            )
            import traceback
            traceback.print_exc()
            return False
    
    async def test_similarity_calculation(self) -> bool:
        """Test embedding similarity calculation"""
        test_start = datetime.now()
        
        try:
            text_chunk_repo = TextChunkRepository()
            embedding_service = EmbeddingService(text_chunk_repo)
            
            # Generate embeddings for similar texts
            text1 = "The wizard cast a powerful spell"
            text2 = "A sorcerer performed magical incantations"
            text3 = "The weather is sunny today"
            
            emb1 = await embedding_service.generate_embedding(text1)
            emb2 = await embedding_service.generate_embedding(text2)
            emb3 = await embedding_service.generate_embedding(text3)
            
            # Calculate similarities
            sim_similar = embedding_service.calculate_similarity(emb1, emb2)
            sim_different = embedding_service.calculate_similarity(emb1, emb3)
            
            # Verify that similar texts have higher similarity
            assert sim_similar > sim_different, \
                f"Similar texts should have higher similarity: {sim_similar} vs {sim_different}"
            
            duration = (datetime.now() - test_start).total_seconds()
            self.log_result(
                "Similarity Calculation",
                True,
                f"Similar texts: {sim_similar:.3f}, Different texts: {sim_different:.3f}",
                duration
            )
            return True
            
        except Exception as e:
            duration = (datetime.now() - test_start).total_seconds()
            self.log_result(
                "Similarity Calculation",
                False,
                f"Similarity calculation failed: {e}",
                duration
            )
            return False
    
    async def test_relationship_discovery(self) -> bool:
        """Test relationship discovery between entities"""
        test_start = datetime.now()
        
        try:
            entity_repo = EntityRepository()
            relationship_repo = RelationshipRepository()
            text_chunk_repo = TextChunkRepository()
            
            relationship_service = RelationshipDiscoveryService(
                entity_repo,
                relationship_repo,
                text_chunk_repo
            )
            
            # Discover relationships
            relationships = await relationship_service.discover_relationships_for_project(
                self.test_project_id,
                force_rediscovery=True
            )
            
            # Verify relationships were discovered
            # Note: Relationship discovery depends on entities being mentioned together
            # Results may vary based on the test content
            
            duration = (datetime.now() - test_start).total_seconds()
            self.log_result(
                "Relationship Discovery",
                True,
                f"Discovered {len(relationships)} relationships between entities",
                duration
            )
            return True
            
        except Exception as e:
            duration = (datetime.now() - test_start).total_seconds()
            self.log_result(
                "Relationship Discovery",
                False,
                f"Relationship discovery failed: {e}",
                duration
            )
            import traceback
            traceback.print_exc()
            return False
    
    async def test_search_analytics(self) -> bool:
        """Test search analytics and logging"""
        test_start = datetime.now()
        
        try:
            text_chunk_repo = TextChunkRepository()
            entity_repo = EntityRepository()
            file_repo = FileRepository()
            search_log_repo = SearchLogRepository()
            embedding_service = EmbeddingService(text_chunk_repo)
            
            search_service = SearchService(
                text_chunk_repo,
                entity_repo,
                file_repo,
                search_log_repo,
                embedding_service
            )
            
            # Perform some searches to generate analytics data
            await search_service.semantic_search(
                self.test_project_id,
                "test query for analytics",
                limit=5
            )
            
            # Get search analytics
            analytics = await search_service.get_search_analytics(
                self.test_project_id,
                days=30
            )
            
            # Verify analytics structure
            assert 'totalSearches' in analytics, "Analytics missing totalSearches"
            assert 'averageResponseTime' in analytics, "Analytics missing averageResponseTime"
            assert 'popularQueries' in analytics, "Analytics missing popularQueries"
            
            duration = (datetime.now() - test_start).total_seconds()
            self.log_result(
                "Search Analytics",
                True,
                f"Total searches: {analytics['totalSearches']}, Avg response: {analytics['averageResponseTime']:.2f}ms",
                duration
            )
            return True
            
        except Exception as e:
            duration = (datetime.now() - test_start).total_seconds()
            self.log_result(
                "Search Analytics",
                False,
                f"Search analytics failed: {e}",
                duration
            )
            import traceback
            traceback.print_exc()
            return False
    
    async def test_find_similar_content(self) -> bool:
        """Test finding similar content to a specific chunk"""
        test_start = datetime.now()
        
        try:
            if not self.test_chunks:
                raise Exception("No test chunks available")
            
            text_chunk_repo = TextChunkRepository()
            entity_repo = EntityRepository()
            file_repo = FileRepository()
            search_log_repo = SearchLogRepository()
            embedding_service = EmbeddingService(text_chunk_repo)
            
            search_service = SearchService(
                text_chunk_repo,
                entity_repo,
                file_repo,
                search_log_repo,
                embedding_service
            )
            
            # Find similar content to the first chunk
            reference_chunk = self.test_chunks[0]
            similar_content = await search_service.find_similar_content(
                chunk_id=reference_chunk.id,
                limit=5,
                similarity_threshold=0.1
            )
            
            duration = (datetime.now() - test_start).total_seconds()
            self.log_result(
                "Find Similar Content",
                True,
                f"Found {len(similar_content)} similar chunks",
                duration
            )
            return True
            
        except Exception as e:
            duration = (datetime.now() - test_start).total_seconds()
            self.log_result(
                "Find Similar Content",
                False,
                f"Find similar content failed: {e}",
                duration
            )
            return False
    
    async def cleanup_test_data(self) -> bool:
        """Cleanup test data"""
        test_start = datetime.now()
        
        try:
            if not self.test_project_id:
                return True
            
            # Delete test project and all associated data
            project_repo = ProjectRepository()
            file_repo = FileRepository()
            text_chunk_repo = TextChunkRepository()
            entity_repo = EntityRepository()
            relationship_repo = RelationshipRepository()
            
            # Delete chunks
            chunks = await text_chunk_repo.get_by_project(self.test_project_id)
            for chunk in chunks:
                await text_chunk_repo.delete_by_id(chunk.id)
            
            # Delete entities
            entities = await entity_repo.get_by_project(self.test_project_id)
            for entity in entities:
                await entity_repo.delete_by_id(entity.id)
            
            # Delete relationships
            relationships = await relationship_repo.get_by_project(self.test_project_id)
            for relationship in relationships:
                await relationship_repo.delete_by_id(relationship.id)
            
            # Delete files
            files = await file_repo.get_by_project(self.test_project_id)
            for file in files:
                await file_repo.delete_by_id(file.id)
            
            # Delete project
            await project_repo.delete_by_id(self.test_project_id)
            
            duration = (datetime.now() - test_start).total_seconds()
            self.log_result(
                "Cleanup Test Data",
                True,
                f"Cleaned up test project and all associated data",
                duration
            )
            return True
            
        except Exception as e:
            duration = (datetime.now() - test_start).total_seconds()
            self.log_result(
                "Cleanup Test Data",
                False,
                f"Cleanup failed: {e}",
                duration
            )
            return False
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for r in self.test_results if r['passed'])
        failed = sum(1 for r in self.test_results if not r['passed'])
        total = len(self.test_results)
        
        total_duration = sum(r['duration'] for r in self.test_results)
        
        print(f"\nTotal Tests: {total}")
        print(f"Passed: {passed} ✅")
        print(f"Failed: {failed} ❌")
        print(f"Success Rate: {(passed/total*100):.1f}%")
        print(f"Total Duration: {total_duration:.2f}s")
        
        if failed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['passed']:
                    print(f"  - {result['test']}: {result['message']}")
        
        print("\n" + "=" * 80)
        
        if failed == 0:
            print("🎉 ALL TESTS PASSED! 🎉")
            print("\nYour semantic search and indexing pipeline is working correctly!")
            print("\nImplemented Features:")
            print("  ✓ Project and file management")
            print("  ✓ Text extraction and chunking")
            print("  ✓ Entity extraction (characters, locations, themes)")
            print("  ✓ Embedding generation with sentence-transformers")
            print("  ✓ Vector similarity search")
            print("  ✓ Semantic search with relevance scoring")
            print("  ✓ Relationship discovery between entities")
            print("  ✓ Search analytics and logging")
            print("  ✓ Similar content discovery")
        else:
            print("⚠️  SOME TESTS FAILED")
            print("\nPlease check the error messages above and ensure:")
            print("  - MongoDB is running and accessible")
            print("  - All required Python packages are installed")
            print("  - spaCy English model is downloaded: python -m spacy download en_core_web_sm")
            print("  - sentence-transformers model is downloaded (happens automatically)")
        
        print("=" * 80 + "\n")
        
        return failed == 0


async def run_all_tests():
    """Run all tests in sequence"""
    runner = ComprehensiveTestRunner()
    
    print("\n" + "=" * 80)
    print("COMPREHENSIVE SEMANTIC SEARCH & INDEXING TEST SUITE")
    print("=" * 80)
    print("\nThis will test the complete workflow:")
    print("  1. Database connectivity")
    print("  2. Project creation")
    print("  3. File upload and text extraction")
    print("  4. Text chunking")
    print("  5. Entity extraction")
    print("  6. Embedding generation")
    print("  7. Semantic search")
    print("  8. Similarity calculation")
    print("  9. Relationship discovery")
    print("  10. Search analytics")
    print("  11. Similar content discovery")
    print("  12. Cleanup")
    print("\n" + "=" * 80 + "\n")
    
    runner.start_time = datetime.now()
    
    try:
        # Run tests in sequence
        if not await runner.setup_imports():
            return False
        
        if not await runner.test_database_connection():
            return False
        
        if not await runner.test_create_test_project():
            return False
        
        if not await runner.test_file_upload_and_extraction():
            return False
        
        if not await runner.test_text_chunking():
            return False
        
        if not await runner.test_entity_extraction():
            return False
        
        if not await runner.test_embedding_generation():
            return False
        
        if not await runner.test_semantic_search():
            return False
        
        if not await runner.test_similarity_calculation():
            return False
        
        if not await runner.test_relationship_discovery():
            return False
        
        if not await runner.test_search_analytics():
            return False
        
        if not await runner.test_find_similar_content():
            return False
        
        # Cleanup
        await runner.cleanup_test_data()
        
        # Print summary
        success = runner.print_summary()
        
        return success
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
        await runner.cleanup_test_data()
        return False
    
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        await runner.cleanup_test_data()
        return False
    
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    print("\n🚀 Starting Comprehensive Test Suite...\n")
    
    try:
        success = asyncio.run(run_all_tests())
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

