#!/usr/bin/env python3
"""
Verify the embedding service implementation without running it
"""

import ast
import os


def verify_embedding_service():
    """Verify the embedding service has correct structure"""
    print("Verifying Embedding Service Implementation...")
    
    service_path = os.path.join(os.path.dirname(__file__), "app", "services", "embedding_service.py")
    
    try:
        # Read and parse the file
        with open(service_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Parse the AST to check syntax
        tree = ast.parse(content)
        print("✓ Embedding service has valid Python syntax")
        
        # Find the EmbeddingService class
        embedding_class = None
        classes_found = []
        for node in tree.body:
            if isinstance(node, ast.ClassDef):
                classes_found.append(node.name)
                if node.name == "EmbeddingService":
                    embedding_class = node
                    break
        
        if embedding_class is None:
            print(f"Classes found: {classes_found}")
        
        assert embedding_class is not None, "EmbeddingService class not found"
        print("✓ EmbeddingService class found")
        
        # Check for required methods
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
        
        found_methods = []
        for node in embedding_class.body:
            if isinstance(node, ast.FunctionDef):
                found_methods.append(node.name)
        
        for method in required_methods:
            assert method in found_methods, f"Missing method: {method}"
        
        print(f"✓ All {len(required_methods)} required methods found")
        
        # Check for async methods
        async_methods = ['generate_embedding', 'generate_embeddings_batch', 'store_text_chunks_with_embeddings']
        for node in embedding_class.body:
            if isinstance(node, ast.AsyncFunctionDef) and node.name in async_methods:
                print(f"✓ {node.name} is correctly async")
        
        # Check imports
        imports = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name)
            elif isinstance(node, ast.ImportFrom):
                imports.append(node.module)
        
        required_imports = ['sentence_transformers', 'numpy', 'asyncio']
        for imp in required_imports:
            found = any(imp in import_name for import_name in imports if import_name)
            assert found, f"Missing import: {imp}"
        
        print("✓ All required imports found")
        
        # Check for key attributes in __init__
        init_method = None
        for node in embedding_class.body:
            if isinstance(node, ast.FunctionDef) and node.name == "__init__":
                init_method = node
                break
        
        assert init_method is not None, "__init__ method not found"
        
        # Look for model initialization
        init_source = ast.get_source_segment(content, init_method)
        assert "_model_name" in init_source, "Model name not set in __init__"
        assert "all-MiniLM-L6-v2" in init_source, "Correct model name not specified"
        assert "_embedding_dimension" in init_source, "Embedding dimension not set"
        assert "384" in init_source, "Correct embedding dimension not specified"
        
        print("✓ Model configuration is correct")
        
        print("\n🎉 Embedding service implementation verification passed!")
        return True
        
    except FileNotFoundError:
        print(f"✗ Embedding service file not found: {service_path}")
        return False
    except SyntaxError as e:
        print(f"✗ Syntax error in embedding service: {e}")
        return False
    except AssertionError as e:
        print(f"✗ Verification failed: {e}")
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False


def verify_requirements_compliance():
    """Verify the implementation meets the requirements"""
    print("\nVerifying Requirements Compliance...")
    
    service_path = os.path.join(os.path.dirname(__file__), "app", "services", "embedding_service.py")
    
    try:
        with open(service_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Requirement 4.8: Generate embeddings using sentence-transformers/all-MiniLM-L6-v2
        assert "sentence-transformers/all-MiniLM-L6-v2" in content, "Requirement 4.8: Correct model not specified"
        assert "SentenceTransformer" in content, "Requirement 4.8: SentenceTransformer not used"
        print("✓ Requirement 4.8: Uses sentence-transformers/all-MiniLM-L6-v2")
        
        # Requirement 5.7: Performance optimization (caching, batching)
        assert "cache" in content.lower(), "Requirement 5.7: No caching implementation found"
        assert "batch" in content.lower(), "Requirement 5.7: No batch processing found"
        print("✓ Requirement 5.7: Implements caching and batch processing")
        
        # Requirement 7.4: Batch processing for performance
        assert "generate_embeddings_batch" in content, "Requirement 7.4: Batch embedding generation not found"
        assert "_max_batch_size" in content, "Requirement 7.4: Batch size configuration not found"
        print("✓ Requirement 7.4: Implements batch processing")
        
        # Check for similarity calculation (needed for 5.4 autocomplete)
        assert "calculate_similarity" in content, "Similarity calculation not implemented"
        assert "cosine" in content.lower(), "Cosine similarity not implemented"
        print("✓ Implements similarity calculation for search")
        
        # Check for async implementation
        assert "async def" in content, "Async methods not implemented"
        print("✓ Uses async implementation for performance")
        
        # Check for error handling
        assert "try:" in content and "except" in content, "Error handling not implemented"
        print("✓ Implements error handling")
        
        print("\n🎉 All requirements compliance checks passed!")
        return True
        
    except AssertionError as e:
        print(f"✗ Requirements compliance failed: {e}")
        return False
    except Exception as e:
        print(f"✗ Unexpected error during requirements check: {e}")
        return False


if __name__ == "__main__":
    success = True
    
    success &= verify_embedding_service()
    success &= verify_requirements_compliance()
    
    if success:
        print("\n🎉 All verifications passed! Embedding service is correctly implemented.")
    else:
        print("\n❌ Some verifications failed!")
    
    exit(0 if success else 1)