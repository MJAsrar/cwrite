# API Integration Testing Guide - Phase 1

## Overview

This guide covers Phase 1 of the testing strategy: **API Integration Testing (Black-Box)**. These tests verify that your backend API works correctly from an external perspective, testing complete user workflows without knowledge of internal implementation.

## What is API Integration Testing?

API Integration Testing validates:
- ✅ HTTP endpoints respond correctly
- ✅ Authentication and authorization work
- ✅ Data flows through the system properly
- ✅ Business logic produces expected results
- ✅ Error handling is appropriate
- ✅ Complete user workflows function end-to-end

## Quick Start

### 1. Prerequisites

Ensure you have:
- Python 3.8+ installed
- Backend server running
- MongoDB running
- Redis running
- ChromaDB initialized

### 2. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Start Backend Server

```bash
# Terminal 1: Start backend
cd backend
uvicorn app.main:app --reload
```

### 4. Run Tests

```bash
# Terminal 2: Run tests
cd backend

# Windows
run_integration_tests.bat

# Linux/Mac
chmod +x run_integration_tests.sh
./run_integration_tests.sh
```

## Test Structure

```
backend/tests/
├── __init__.py                      # Package initialization
├── conftest.py                      # Pytest fixtures and configuration
├── .env.test                        # Test environment variables
├── README.md                        # Test documentation
├── test_health.py                   # System health tests
├── test_auth_api.py                 # Authentication tests (12 tests)
├── test_projects_api.py             # Project management tests (11 tests)
├── test_files_api.py                # File management tests (14 tests)
├── test_search_api.py               # Search functionality tests (12 tests)
├── test_chat_api.py                 # Chat/AI tests (5 tests)
└── test_integration_workflows.py    # End-to-end workflows (3 tests)
```

**Total: ~60 integration tests**

## Running Specific Tests

### Run All Tests
```bash
pytest tests/ -v
```

### Run Specific Test File
```bash
pytest tests/test_auth_api.py -v
```

### Run Specific Test Class
```bash
pytest tests/test_auth_api.py::TestAuthenticationAPI -v
```

### Run Specific Test
```bash
pytest tests/test_auth_api.py::TestAuthenticationAPI::test_login_valid_credentials -v
```

### Run Tests by Marker
```bash
# Run only auth tests
pytest tests/ -m auth -v

# Run only slow tests
pytest tests/ -m slow -v

# Run everything except slow tests
pytest tests/ -m "not slow" -v
```

### Run Tests Matching Pattern
```bash
# Run all tests with "login" in the name
pytest tests/ -k "login" -v

# Run all tests with "search" or "embedding"
pytest tests/ -k "search or embedding" -v
```

## Test Coverage

### Generate Coverage Report
```bash
# Run tests with coverage
pytest tests/ --cov=app --cov-report=html --cov-report=term

# Open HTML report
# Windows
start htmlcov/index.html

# Linux/Mac
open htmlcov/index.html
```

### Coverage Goals
- **Phase 1 (Integration)**: Focus on API endpoint coverage
- **Target**: 80%+ of API endpoints tested
- **Critical paths**: 100% coverage (auth, file upload, search)

## Understanding Test Results

### Successful Test Output
```
tests/test_auth_api.py::TestAuthenticationAPI::test_login_valid_credentials PASSED [100%]

================================ 1 passed in 0.52s =================================
```

### Failed Test Output
```
tests/test_auth_api.py::TestAuthenticationAPI::test_login_valid_credentials FAILED [100%]

_________________________________ test_login_valid_credentials __________________________________

    async def test_login_valid_credentials(self, api_client: AsyncClient):
        """Test login with valid credentials"""
        login_data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        
        response = await api_client.post("/api/v1/auth/login", json=login_data)
        
>       assert response.status_code == 200
E       assert 401 == 200

tests/test_auth_api.py:45: AssertionError
```

## Common Issues and Solutions

### Issue: Backend Not Running
```
Error: Backend server is not running!
```
**Solution**: Start the backend server:
```bash
cd backend
uvicorn app.main:app --reload
```

### Issue: Database Connection Failed
```
Error: Failed to connect to MongoDB
```
**Solution**: 
1. Check MongoDB is running
2. Verify `.env` configuration
3. Test connection: `mongosh <your-connection-string>`

### Issue: Tests Timeout
```
TimeoutError: File processing took too long
```
**Solution**:
1. Check background workers are running
2. Increase timeout in `conftest.py`
3. Check system resources

### Issue: Import Errors
```
ModuleNotFoundError: No module named 'pytest'
```
**Solution**:
```bash
pip install pytest pytest-asyncio httpx python-dotenv
```

### Issue: Authentication Failures
```
AssertionError: assert 401 == 200
```
**Solution**:
1. Check auth service is working
2. Verify JWT secret key is set
3. Check user exists in database

## Test Data Management

### Automatic Cleanup
Tests automatically clean up:
- Projects created during tests
- Files uploaded during tests
- Search indices

### Manual Cleanup
If needed, manually clean test data:
```javascript
// MongoDB shell
use cowrite_ai

// Delete test users
db.users.deleteMany({"email": /test_.*@example.com/})

// Delete test projects
db.projects.deleteMany({"name": /Test Project.*/})

// Delete test files
db.files.deleteMany({"filename": /test_.*/})
```

## Debugging Tests

### Enable Verbose Logging
```bash
pytest tests/ -v --log-cli-level=DEBUG
```

### Run Single Test with Full Output
```bash
pytest tests/test_auth_api.py::TestAuthenticationAPI::test_login_valid_credentials -vv -s
```

### Use Python Debugger
Add breakpoint in test:
```python
@pytest.mark.asyncio
async def test_something(self, api_client):
    response = await api_client.get("/api/v1/endpoint")
    import pdb; pdb.set_trace()  # Debugger will stop here
    assert response.status_code == 200
```

### Check Backend Logs
Monitor backend logs while running tests:
```bash
# Terminal 1: Backend with debug logging
uvicorn app.main:app --reload --log-level debug

# Terminal 2: Run tests
pytest tests/ -v
```

## Performance Benchmarks

Expected execution times:

| Test Suite | Tests | Time |
|------------|-------|------|
| Health | 3 | < 1s |
| Auth | 12 | 2-5s |
| Projects | 11 | 3-7s |
| Files | 14 | 10-20s |
| Search | 12 | 15-30s |
| Chat | 5 | 5-10s |
| Workflows | 3 | 20-40s |
| **Total** | **60** | **2-5 min** |

## CI/CD Integration

### GitHub Actions Example
```yaml
name: API Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:6
        ports:
          - 27017:27017
      
      redis:
        image: redis:7
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      
      - name: Start backend
        run: |
          cd backend
          uvicorn app.main:app &
          sleep 10
      
      - name: Run tests
        run: |
          cd backend
          pytest tests/ -v --junitxml=test-results.xml
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: backend/test-results.xml
```

## Best Practices

### Writing New Tests

1. **Follow naming conventions**:
   ```python
   class TestFeatureAPI:
       @pytest.mark.asyncio
       async def test_specific_behavior(self, api_client, auth_headers):
           """Clear description of what is being tested"""
   ```

2. **Use fixtures for setup**:
   ```python
   @pytest.fixture
   async def test_resource(api_client, auth_headers):
       # Setup
       resource = await create_resource()
       yield resource
       # Cleanup
       await delete_resource(resource)
   ```

3. **Test one thing per test**:
   ```python
   # Good
   async def test_create_project_success(self):
       # Test successful creation
   
   async def test_create_project_duplicate_name(self):
       # Test duplicate name error
   
   # Bad
   async def test_create_project(self):
       # Test success, duplicate, invalid data, etc.
   ```

4. **Use descriptive assertions**:
   ```python
   # Good
   assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
   
   # Bad
   assert response.status_code == 200
   ```

5. **Clean up after tests**:
   ```python
   async def test_something(self, api_client, auth_headers):
       # Create resource
       resource = await create_resource()
       
       try:
           # Test logic
           assert something
       finally:
           # Always cleanup
           await delete_resource(resource)
   ```

## Next Steps

After Phase 1 integration tests pass:

### Phase 2: Unit Tests (White-Box)
- Test individual services in isolation
- Mock external dependencies
- Test edge cases and error conditions
- Target: 90%+ code coverage

### Phase 3: Frontend Tests
- Component tests with Jest + React Testing Library
- Test UI interactions
- Test state management
- Mock API calls

### Phase 4: E2E Tests
- Full browser automation with Playwright/Cypress
- Test complete user journeys
- Cross-browser testing
- Visual regression testing

### Phase 5: Performance & Security
- Load testing with Locust/k6
- Security scanning
- Penetration testing
- Performance profiling

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [HTTPX Documentation](https://www.python-httpx.org/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [Testing Best Practices](https://testdriven.io/blog/testing-best-practices/)

## Support

If you encounter issues:
1. Check this guide
2. Review test logs
3. Check backend logs
4. Review test code in `tests/`
5. Check `conftest.py` for fixture configuration

## Contributing

When adding new features:
1. Write integration tests first (TDD)
2. Ensure all tests pass
3. Update this guide if needed
4. Add test markers appropriately
5. Document any new fixtures
