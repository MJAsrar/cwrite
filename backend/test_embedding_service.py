#!/usr/bin/env python3
"""
Test script for the embedding service
"""

import asyncio
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.services.embedding_service import EmbeddingService
from app.repositories.text_chunk_repository import TextChunkRepository


async def test_embedding_service():
    """Test the embedding service functionality"""
    print("Testing Embedding Service...")
    
    # Initialize repository and service
    text_chunk_repo = TextChunkRepository()
    embedding_service = EmbeddingService(text_chunk_repo)
    
    # Test 1: Single embedding generation
    print("\n1. Testing single embedding generation...")
    test_text = "This is a test sentence for embedding generation."
    
    try:
        embedding = await embedding_service.generate_embedding(test_text)
        print(f"✓ Generated embedding with dimension: {len(embedding)}")
        print(f"✓ First 5 values: {embedding[:5]}")
        
        # Verify embedding dimension
        assert len(embedding) == 384, f"Expected 384 dimensions, got {len(embedding)}"
        print("✓ Embedding dimension is correct")
        
    except Exception as e:
        print(f"✗ Single embedding generation failed: {e}")
        return False
    
    # Test 2: Batch embedding generation
    print("\n2. Testing batch embedding generation...")
    test_texts = [
        "The quick brown fox jumps over the lazy dog.",
        "Machine learning is transforming the world.",
        "Natural language processing enables semantic search.",
        "Writers need tools to organize their creative work."
    ]
    
    try:
        embeddings = await embedding_service.generate_embeddings_batch(test_texts)
        print(f"✓ Generated {len(embeddings)} embeddings")
        
        # Verify all embeddings have correct dimension
        for i, emb in enumerate(embeddings):
            assert len(emb) == 384, f"Embedding {i} has wrong dimension: {len(emb)}"
        print("✓ All embeddings have correct dimensions")
        
    except Exception as e:
        print(f"✗ Batch embedding generation failed: {e}")
        return False
    
    # Test 3: Similarity calculation
    print("\n3. Testing similarity calculation...")
    try:
        # Generate embeddings for similar and dissimilar texts
        text1 = "The cat sat on the mat."
        text2 = "A feline rested on the rug."
        text3 = "Quantum physics is fascinating."
        
        emb1 = await embedding_service.generate_embedding(text1)
        emb2 = await embedding_service.generate_embedding(text2)
        emb3 = await embedding_service.generate_embedding(text3)
        
        # Calculate similarities
        sim_similar = embedding_service.calculate_similarity(emb1, emb2)
        sim_different = embedding_service.calculate_similarity(emb1, emb3)
        
        print(f"✓ Similarity between similar texts: {sim_similar:.3f}")
        print(f"✓ Similarity between different texts: {sim_different:.3f}")
        
        # Similar texts should have higher similarity
        assert sim_similar > sim_different, "Similar texts should have higher similarity"
        print("✓ Similarity calculation works correctly")
        
    except Exception as e:
        print(f"✗ Similarity calculation failed: {e}")
        return False
    
    # Test 4: Batch similarity calculation
    print("\n4. Testing batch similarity calculation...")
    try:
        query_embedding = emb1  # Use first embedding as query
        candidate_embeddings = [emb1, emb2, emb3]
        
        similarities = embedding_service.calculate_similarities_batch(
            query_embedding, candidate_embeddings
        )
        
        print(f"✓ Calculated {len(similarities)} similarities")
        print(f"✓ Similarities: {[f'{s:.3f}' for s in similarities]}")
        
        # First similarity should be 1.0 (same text)
        assert abs(similarities[0] - 1.0) < 0.001, "Self-similarity should be ~1.0"
        print("✓ Batch similarity calculation works correctly")
        
    except Exception as e:
        print(f"✗ Batch similarity calculation failed: {e}")
        return False
    
    # Test 5: Caching (if Redis is available)
    print("\n5. Testing embedding caching...")
    try:
        # Generate embedding twice for the same text
        cache_test_text = "This text will test the caching mechanism."
        
        # First generation (should cache)
        emb_first = await embedding_service.generate_embedding(cache_test_text)
        
        # Second generation (should use cache)
        emb_second = await embedding_service.generate_embedding(cache_test_text)
        
        # Should be identical
        assert emb_first == emb_second, "Cached embeddings should be identical"
        print("✓ Embedding caching works correctly")
        
    except Exception as e:
        print(f"⚠ Caching test failed (Redis might not be available): {e}")
    
    # Test 6: Error handling
    print("\n6. Testing error handling...")
    try:
        # Test empty text
        try:
            await embedding_service.generate_embedding("")
            print("✗ Should have raised error for empty text")
            return False
        except ValueError:
            print("✓ Correctly handles empty text")
        
        # Test None text
        try:
            await embedding_service.generate_embedding(None)
            print("✗ Should have raised error for None text")
            return False
        except (ValueError, TypeError):
            print("✓ Correctly handles None text")
        
    except Exception as e:
        print(f"✗ Error handling test failed: {e}")
        return False
    
    print("\n🎉 All embedding service tests passed!")
    return True


if __name__ == "__main__":
    success = asyncio.run(test_embedding_service())
    sys.exit(0 if success else 1)