# API Integration Tests - Phase 1

This directory contains comprehensive API integration tests for the CoWriteAI backend. These tests verify that all API endpoints work correctly end-to-end.

## Test Structure

### Test Files

- **test_health.py** - System health and basic endpoint tests
- **test_auth_api.py** - Authentication and authorization tests
- **test_projects_api.py** - Project management tests
- **test_files_api.py** - File upload, processing, and management tests
- **test_search_api.py** - Search and embedding functionality tests
- **test_chat_api.py** - Chat/AI assistant tests
- **test_integration_workflows.py** - Complete end-to-end workflow tests

### Configuration

- **conftest.py** - Pytest fixtures and configuration
- **README.md** - This file

## Prerequisites

1. **Backend server must be running**:
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

2. **Required dependencies**:
   ```bash
   pip install pytest pytest-asyncio httpx python-dotenv
   ```

3. **Environment variables** (optional):
   - `TEST_API_URL` - Backend URL (default: http://localhost:8000)
   - Test user credentials are auto-generated

## Running Tests

### Windows

```cmd
cd backend
run_integration_tests.bat
```

### Linux/Mac

```bash
cd backend
chmod +x run_integration_tests.sh
./run_integration_tests.sh
```

### Manual Execution

```bash
# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/test_auth_api.py -v

# Run specific test
pytest tests/test_auth_api.py::TestAuthenticationAPI::test_login_valid_credentials -v

# Run with coverage
pytest tests/ --cov=app --cov-report=html

# Run tests matching a pattern
pytest tests/ -k "auth" -v
```

## Test Coverage

### Authentication (test_auth_api.py)
- ✅ User registration with validation
- ✅ Login with valid/invalid credentials
- ✅ Token refresh
- ✅ Logout
- ✅ Get current user info
- ✅ Unauthorized access handling

### Projects (test_projects_api.py)
- ✅ Create project
- ✅ List projects with pagination
- ✅ Get project details
- ✅ Update project
- ✅ Delete project
- ✅ Project isolation (access control)
- ✅ Duplicate name handling

### Files (test_files_api.py)
- ✅ Upload file
- ✅ List project files
- ✅ Get file metadata
- ✅ Get file content (text/raw)
- ✅ Update file content
- ✅ Delete file (cascade delete)
- ✅ Reprocess file
- ✅ File processing status
- ✅ Project file statistics
- ✅ File access control

### Search (test_search_api.py)
- ✅ Semantic search
- ✅ Hybrid search
- ✅ Search with filters
- ✅ Search pagination
- ✅ Generate embeddings
- ✅ Calculate similarity
- ✅ Embedding statistics
- ✅ Autocomplete suggestions
- ✅ Find similar content

### Chat (test_chat_api.py)
- ✅ Send chat message
- ✅ Chat with context
- ✅ Conversation history
- ✅ Unauthorized access

### Workflows (test_integration_workflows.py)
- ✅ Complete project workflow
- ✅ File update workflow
- ✅ Multi-file search workflow

## Test Fixtures

### Shared Fixtures (conftest.py)

- **api_client** - Async HTTP client for API requests
- **auth_tokens** - Authentication tokens for test user
- **auth_headers** - Authorization headers
- **test_project** - Pre-created test project (auto-cleanup)
- **test_file** - Pre-uploaded test file (auto-cleanup)

## Expected Results

All tests should pass when:
1. Backend server is running
2. MongoDB is accessible
3. Redis is accessible
4. ChromaDB is initialized
5. All required services are configured

## Troubleshooting

### Backend Not Running
```
Error: Backend server is not running!
```
**Solution**: Start the backend server first:
```bash
cd backend
uvicorn app.main:app --reload
```

### Database Connection Errors
```
Error: Failed to connect to MongoDB
```
**Solution**: Check your `.env` file and ensure MongoDB is running

### Test Failures
1. Check backend logs for errors
2. Verify all services (MongoDB, Redis, ChromaDB) are running
3. Check environment variables in `.env`
4. Run tests individually to isolate issues

### Timeout Errors
Some tests wait for file processing. If tests timeout:
- Increase wait times in test fixtures
- Check background task processing
- Verify Celery workers are running (if applicable)

## Test Data Cleanup

Tests automatically clean up after themselves:
- Test users remain (for reuse)
- Test projects are deleted after each test
- Test files are deleted after each test

To manually clean up test data:
```python
# Connect to MongoDB and delete test data
db.users.deleteMany({"email": /test_.*@example.com/})
db.projects.deleteMany({"name": /Test Project.*/})
```

## CI/CD Integration

These tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Integration Tests
  run: |
    cd backend
    pytest tests/ -v --junitxml=test-results.xml
```

## Performance Benchmarks

Expected test execution times:
- Health tests: < 1 second
- Auth tests: 2-5 seconds
- Project tests: 3-7 seconds
- File tests: 10-20 seconds (includes processing)
- Search tests: 15-30 seconds (includes indexing)
- Complete workflow: 20-40 seconds

Total suite: ~2-5 minutes

## Next Steps (Phase 2)

After Phase 1 integration tests pass:
1. Add unit tests for individual services
2. Add frontend component tests
3. Add E2E tests with Playwright/Cypress
4. Add performance/load tests
5. Add security tests

## Contributing

When adding new API endpoints:
1. Add corresponding integration tests
2. Update this README
3. Ensure all tests pass before committing
4. Follow existing test patterns and naming conventions
