#!/usr/bin/env python3
"""
Simple test for embedding functionality without full app context
"""

import asyncio
import numpy as np
from sentence_transformers import SentenceTransformer
import json
import hashlib


class SimpleEmbeddingTest:
    """Simple embedding test class"""
    
    def __init__(self):
        self.model_name = "sentence-transformers/all-MiniLM-L6-v2"
        self.model = None
        self.embedding_dimension = 384
    
    def load_model(self):
        """Load the SentenceTransformer model"""
        if self.model is None:
            print(f"Loading model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            self.model.eval()
            print("Model loaded successfully")
        return self.model
    
    def generate_embedding(self, text: str):
        """Generate embedding for text"""
        model = self.load_model()
        
        # Preprocess text
        text = ' '.join(text.split())
        
        # Generate embedding
        embedding = model.encode([text], normalize_embeddings=True)[0]
        return embedding.tolist()
    
    def generate_embeddings_batch(self, texts):
        """Generate embeddings for multiple texts"""
        model = self.load_model()
        
        # Preprocess texts
        processed_texts = [' '.join(text.split()) for text in texts]
        
        # Generate embeddings
        embeddings = model.encode(
            processed_texts,
            batch_size=32,
            normalize_embeddings=True,
            show_progress_bar=False
        )
        
        return [emb.tolist() for emb in embeddings]
    
    def calculate_similarity(self, emb1, emb2):
        """Calculate cosine similarity"""
        vec1 = np.array(emb1)
        vec2 = np.array(emb2)
        
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return float(dot_product / (norm1 * norm2))


def test_embedding_functionality():
    """Test embedding functionality"""
    print("Testing Embedding Functionality...")
    
    tester = SimpleEmbeddingTest()
    
    # Test 1: Single embedding
    print("\n1. Testing single embedding generation...")
    try:
        text = "This is a test sentence for embedding generation."
        embedding = tester.generate_embedding(text)
        
        print(f"✓ Generated embedding with dimension: {len(embedding)}")
        print(f"✓ First 5 values: {embedding[:5]}")
        
        assert len(embedding) == 384, f"Expected 384 dimensions, got {len(embedding)}"
        print("✓ Embedding dimension is correct")
        
    except Exception as e:
        print(f"✗ Single embedding test failed: {e}")
        return False
    
    # Test 2: Batch embeddings
    print("\n2. Testing batch embedding generation...")
    try:
        texts = [
            "The quick brown fox jumps over the lazy dog.",
            "Machine learning is transforming the world.",
            "Natural language processing enables semantic search.",
            "Writers need tools to organize their creative work."
        ]
        
        embeddings = tester.generate_embeddings_batch(texts)
        
        print(f"✓ Generated {len(embeddings)} embeddings")
        
        for i, emb in enumerate(embeddings):
            assert len(emb) == 384, f"Embedding {i} has wrong dimension: {len(emb)}"
        
        print("✓ All embeddings have correct dimensions")
        
    except Exception as e:
        print(f"✗ Batch embedding test failed: {e}")
        return False
    
    # Test 3: Similarity calculation
    print("\n3. Testing similarity calculation...")
    try:
        text1 = "The cat sat on the mat."
        text2 = "A feline rested on the rug."
        text3 = "Quantum physics is fascinating."
        
        emb1 = tester.generate_embedding(text1)
        emb2 = tester.generate_embedding(text2)
        emb3 = tester.generate_embedding(text3)
        
        sim_similar = tester.calculate_similarity(emb1, emb2)
        sim_different = tester.calculate_similarity(emb1, emb3)
        
        print(f"✓ Similarity between similar texts: {sim_similar:.3f}")
        print(f"✓ Similarity between different texts: {sim_different:.3f}")
        
        assert sim_similar > sim_different, "Similar texts should have higher similarity"
        print("✓ Similarity calculation works correctly")
        
    except Exception as e:
        print(f"✗ Similarity test failed: {e}")
        return False
    
    # Test 4: Performance test
    print("\n4. Testing performance...")
    try:
        import time
        
        # Test batch processing performance
        large_texts = [f"This is test sentence number {i} for performance testing." for i in range(100)]
        
        start_time = time.time()
        embeddings = tester.generate_embeddings_batch(large_texts)
        end_time = time.time()
        
        processing_time = end_time - start_time
        print(f"✓ Processed 100 texts in {processing_time:.2f} seconds")
        print(f"✓ Average time per text: {processing_time/100*1000:.1f}ms")
        
        # Should be reasonably fast
        assert processing_time < 30, "Processing should complete within 30 seconds"
        print("✓ Performance is acceptable")
        
    except Exception as e:
        print(f"✗ Performance test failed: {e}")
        return False
    
    print("\n🎉 All embedding functionality tests passed!")
    return True


if __name__ == "__main__":
    success = test_embedding_functionality()
    exit(0 if success else 1)