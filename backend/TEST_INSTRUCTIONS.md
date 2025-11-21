# Comprehensive Backend Test Instructions

This guide explains how to run the comprehensive semantic search and indexing test suite.

## Test File

`test_comprehensive_search_indexing.py` - A single comprehensive test that validates all semantic search and indexing functionality.

## What It Tests

The test suite validates the complete workflow:

1. ✅ **Database Connection** - MongoDB connectivity
2. ✅ **Project Creation** - Creating test projects
3. ✅ **File Upload & Text Extraction** - Uploading files and extracting text content
4. ✅ **Text Chunking** - Breaking text into semantic chunks
5. ✅ **Entity Extraction** - Extracting characters, locations, and themes using spaCy
6. ✅ **Embedding Generation** - Generating vector embeddings with sentence-transformers
7. ✅ **Semantic Search** - Vector similarity search with relevance scoring
8. ✅ **Similarity Calculation** - Computing similarity between embeddings
9. ✅ **Relationship Discovery** - Finding relationships between entities
10. ✅ **Search Analytics** - Tracking search queries and performance
11. ✅ **Similar Content Discovery** - Finding similar content chunks
12. ✅ **Cleanup** - Removing test data after completion

## Prerequisites

### 1. Install Required Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Download spaCy Model

```bash
python -m spacy download en_core_web_sm
```

### 3. Ensure MongoDB is Running

The test requires a running MongoDB instance. You can:

**Option A: Use Docker Compose (Recommended)**
```bash
cd ..  # Go to project root
docker-compose up -d mongodb
```

**Option B: Use Local MongoDB**
```bash
# Make sure MongoDB is running on localhost:27017
# Or update DATABASE_URL in backend/app/core/config.py
```

### 4. Verify Configuration

Check `backend/app/core/config.py` to ensure database settings are correct:

```python
DATABASE_URL: str = "mongodb://localhost:27017"  # Default
MONGODB_DB_NAME: str = "cowrite_ai"
```

## Running the Test

### Quick Run

From the `backend` directory:

```bash
python test_comprehensive_search_indexing.py
```

Or make it executable and run:

```bash
chmod +x test_comprehensive_search_indexing.py
./test_comprehensive_search_indexing.py
```

### Expected Output

You should see output like this:

```
🚀 Starting Comprehensive Test Suite...

================================================================================
COMPREHENSIVE SEMANTIC SEARCH & INDEXING TEST SUITE
================================================================================

This will test the complete workflow:
  1. Database connectivity
  2. Project creation
  ...
  
================================================================================

✅ PASSED - Import Dependencies (0.45s)
   All required modules imported successfully
✅ PASSED - Database Connection (0.12s)
   Connected to MongoDB with 15 collections
✅ PASSED - Create Test Project (0.08s)
   Project created with ID: 507f1f77bcf86cd799439011
...

================================================================================
TEST SUMMARY
================================================================================

Total Tests: 12
Passed: 12 ✅
Failed: 0 ❌
Success Rate: 100.0%
Total Duration: 15.34s

🎉 ALL TESTS PASSED! 🎉

Your semantic search and indexing pipeline is working correctly!

Implemented Features:
  ✓ Project and file management
  ✓ Text extraction and chunking
  ✓ Entity extraction (characters, locations, themes)
  ✓ Embedding generation with sentence-transformers
  ✓ Vector similarity search
  ✓ Semantic search with relevance scoring
  ✓ Relationship discovery between entities
  ✓ Search analytics and logging
  ✓ Similar content discovery
================================================================================
```

## Troubleshooting

### Import Errors

**Problem:** `ImportError: No module named 'app'`

**Solution:**
```bash
# Make sure you're in the backend directory
cd backend
python test_comprehensive_search_indexing.py
```

### spaCy Model Not Found

**Problem:** `OSError: [E050] Can't find model 'en_core_web_sm'`

**Solution:**
```bash
python -m spacy download en_core_web_sm
```

### MongoDB Connection Error

**Problem:** `Database connection failed: connection refused`

**Solution:**
- Ensure MongoDB is running: `docker-compose up -d mongodb`
- Check connection string in `app/core/config.py`
- Verify MongoDB is accessible: `mongosh mongodb://localhost:27017`

### Sentence Transformers Download

**Problem:** First run might be slow

**Solution:** This is normal! The first run will download the `all-MiniLM-L6-v2` model (~80MB). Subsequent runs will be faster.

### Redis Errors (Optional)

**Problem:** Redis connection warnings

**Solution:** Redis is optional for caching. The test will work without it. To enable Redis:
```bash
docker-compose up -d redis
```

## Test Data

The test creates:
- 1 test project
- 1 test file with sample story content
- Multiple text chunks with embeddings
- Entities (characters, locations, themes)
- Entity relationships
- Search logs

**All test data is automatically cleaned up** after the test completes.

## Running Individual Components

If you want to test individual components, check these existing test files:

```bash
# Test embedding service only
python test_embedding_integration.py

# Test async indexing
python test_async_indexing.py

# Test relationship discovery
python test_relationship_discovery.py
```

## Continuous Integration

To run this test in CI/CD:

```bash
# Set up environment
export DATABASE_URL="mongodb://mongodb:27017"
export MONGODB_DB_NAME="cowrite_ai_test"

# Run test
python backend/test_comprehensive_search_indexing.py

# Check exit code
if [ $? -eq 0 ]; then
  echo "Tests passed!"
else
  echo "Tests failed!"
  exit 1
fi
```

## Performance Notes

- **First run**: ~15-30 seconds (downloads models)
- **Subsequent runs**: ~5-15 seconds
- **Database operations**: ~1-2 seconds total
- **Embedding generation**: ~2-5 seconds (depends on CPU)
- **Search operations**: <1 second

## What Happens During the Test

1. **Setup Phase**
   - Imports all required modules
   - Connects to MongoDB
   - Creates a test user and project

2. **Upload & Processing Phase**
   - Creates a test file with sample story content
   - Extracts text from the file
   - Chunks text into semantic units
   - Extracts entities (characters, locations, themes)

3. **Indexing Phase**
   - Generates embeddings for all text chunks
   - Stores chunks with vector embeddings in MongoDB
   - Creates entity records

4. **Search Phase**
   - Tests semantic search with various queries
   - Validates similarity calculations
   - Tests finding similar content

5. **Advanced Features Phase**
   - Discovers relationships between entities
   - Tests search analytics
   - Validates performance metrics

6. **Cleanup Phase**
   - Removes all test data
   - Closes database connections

## Support

If you encounter any issues:

1. Check the error messages in the test output
2. Verify all prerequisites are met
3. Review the troubleshooting section above
4. Check MongoDB logs: `docker-compose logs mongodb`
5. Enable debug logging by modifying the test file:
   ```python
   logging.basicConfig(level=logging.DEBUG)
   ```

## Next Steps

After all tests pass, you can:

1. **Test with Real Data**: Upload actual documents through the API
2. **Run the Full Stack**: `docker-compose up` to start all services
3. **Use the Frontend**: Access the UI at http://localhost:3000
4. **API Testing**: Use the API at http://localhost:8000/docs

## License

Part of the CoWriteAI project.




