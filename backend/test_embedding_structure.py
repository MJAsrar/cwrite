#!/usr/bin/env python3
"""
Test the structure and interface of the embedding service without dependencies
"""

import sys
import os
import inspect

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))


def test_embedding_service_structure():
    """Test that the embedding service has the correct structure"""
    print("Testing Embedding Service Structure...")
    
    try:
        # Import the service directly to avoid file service dependencies
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "embedding_service", 
            os.path.join(os.path.dirname(__file__), "app", "services", "embedding_service.py")
        )
        embedding_module = importlib.util.module_from_spec(spec)
        
        # Mock the dependencies that cause import issues
        import sys
        sys.modules['app.models.text_chunk'] = type('MockModule', (), {
            'TextChunk': type('TextChunk', (), {}),
            'TextChunkCreate': type('TextChunkCreate', (), {})
        })()
        sys.modules['app.repositories.text_chunk_repository'] = type('MockModule', (), {
            'TextChunkRepository': type('TextChunkRepository', (), {})
        })()
        sys.modules['app.core.redis'] = type('MockModule', (), {
            'get_redis_client': lambda: None
        })()
        
        spec.loader.exec_module(embedding_module)
        EmbeddingService = embedding_module.EmbeddingService
        
        print("✓ EmbeddingService imports successfully")
        
        # Check that the class exists
        assert inspect.isclass(EmbeddingService), "EmbeddingService should be a class"
        print("✓ EmbeddingService is a class")
        
        # Check required methods exist
        required_methods = [
            'generate_embedding',
            'generate_embeddings_batch',
            'store_text_chunks_with_embeddings',
            'calculate_similarity',
            'calculate_similarities_batch',
            'find_similar_chunks',
            'get_embedding_stats',
            'cleanup_embeddings'
        ]
        
        for method_name in required_methods:
            assert hasattr(EmbeddingService, method_name), f"Missing method: {method_name}"
            method = getattr(EmbeddingService, method_name)
            assert callable(method), f"Method {method_name} should be callable"
        
        print(f"✓ All {len(required_methods)} required methods exist")
        
        # Check method signatures
        sig = inspect.signature(EmbeddingService.generate_embedding)
        params = list(sig.parameters.keys())
        assert 'text' in params, "generate_embedding should have 'text' parameter"
        print("✓ generate_embedding has correct signature")
        
        sig = inspect.signature(EmbeddingService.generate_embeddings_batch)
        params = list(sig.parameters.keys())
        assert 'texts' in params, "generate_embeddings_batch should have 'texts' parameter"
        print("✓ generate_embeddings_batch has correct signature")
        
        sig = inspect.signature(EmbeddingService.calculate_similarity)
        params = list(sig.parameters.keys())
        assert 'embedding1' in params and 'embedding2' in params, "calculate_similarity should have embedding parameters"
        print("✓ calculate_similarity has correct signature")
        
        # Check constructor
        sig = inspect.signature(EmbeddingService.__init__)
        params = list(sig.parameters.keys())
        assert 'text_chunk_repository' in params, "Constructor should accept text_chunk_repository"
        print("✓ Constructor has correct signature")
        
        print("\n🎉 Embedding service structure is correct!")
        return True
        
    except ImportError as e:
        print(f"✗ Import error: {e}")
        return False
    except Exception as e:
        print(f"✗ Structure test failed: {e}")
        return False


def test_text_chunk_model_structure():
    """Test that the text chunk model has the correct structure"""
    print("\nTesting TextChunk Model Structure...")
    
    try:
        from app.models.text_chunk import TextChunk, TextChunkCreate
        
        print("✓ TextChunk models import successfully")
        
        # Check TextChunk fields
        chunk_fields = TextChunk.__fields__.keys()
        required_fields = [
            'file_id', 'project_id', 'content', 'start_position', 
            'end_position', 'chunk_index', 'word_count', 'embedding_vector'
        ]
        
        for field in required_fields:
            assert field in chunk_fields, f"TextChunk missing field: {field}"
        
        print(f"✓ TextChunk has all {len(required_fields)} required fields")
        
        # Check TextChunkCreate fields
        create_fields = TextChunkCreate.__fields__.keys()
        required_create_fields = [
            'file_id', 'project_id', 'content', 'start_position', 
            'end_position', 'chunk_index'
        ]
        
        for field in required_create_fields:
            assert field in create_fields, f"TextChunkCreate missing field: {field}"
        
        print(f"✓ TextChunkCreate has all {len(required_create_fields)} required fields")
        
        print("✓ Text chunk models structure is correct!")
        return True
        
    except ImportError as e:
        print(f"✗ Import error: {e}")
        return False
    except Exception as e:
        print(f"✗ Model structure test failed: {e}")
        return False


def test_repository_structure():
    """Test that the text chunk repository has the correct structure"""
    print("\nTesting TextChunkRepository Structure...")
    
    try:
        from app.repositories.text_chunk_repository import TextChunkRepository
        
        print("✓ TextChunkRepository imports successfully")
        
        # Check required methods exist
        required_methods = [
            'get_by_file',
            'get_by_project', 
            'find_by_project',
            'count_all',
            'delete_by_project',
            'vector_search'
        ]
        
        for method_name in required_methods:
            assert hasattr(TextChunkRepository, method_name), f"Missing method: {method_name}"
            method = getattr(TextChunkRepository, method_name)
            assert callable(method), f"Method {method_name} should be callable"
        
        print(f"✓ All {len(required_methods)} required methods exist")
        
        print("✓ Text chunk repository structure is correct!")
        return True
        
    except ImportError as e:
        print(f"✗ Import error: {e}")
        return False
    except Exception as e:
        print(f"✗ Repository structure test failed: {e}")
        return False


if __name__ == "__main__":
    success = True
    
    success &= test_embedding_service_structure()
    success &= test_text_chunk_model_structure()
    success &= test_repository_structure()
    
    if success:
        print("\n🎉 All structure tests passed!")
    else:
        print("\n❌ Some structure tests failed!")
    
    sys.exit(0 if success else 1)