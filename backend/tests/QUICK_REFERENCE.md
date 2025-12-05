# API Integration Tests - Quick Reference

## Run Tests

```bash
# All tests
pytest tests/ -v

# Specific file
pytest tests/test_auth_api.py -v

# Specific test
pytest tests/test_auth_api.py::TestAuthenticationAPI::test_login_valid_credentials -v

# With coverage
pytest tests/ --cov=app --cov-report=html
```

## Test Markers

```bash
pytest tests/ -m auth          # Auth tests only
pytest tests/ -m "not slow"    # Skip slow tests
pytest tests/ -k "login"       # Tests matching "login"
```

## Common Commands

```bash
# Install dependencies
pip install pytest pytest-asyncio httpx python-dotenv pytest-cov

# Start backend
uvicorn app.main:app --reload

# Run with debug logging
pytest tests/ -v --log-cli-level=DEBUG

# Stop on first failure
pytest tests/ -x

# Run last failed tests
pytest tests/ --lf

# Show local variables on failure
pytest tests/ -l
```

## Test Structure

```
tests/
├── test_health.py              # Health checks (3 tests)
├── test_auth_api.py            # Authentication (12 tests)
├── test_projects_api.py        # Projects (11 tests)
├── test_files_api.py           # Files (14 tests)
├── test_search_api.py          # Search (12 tests)
├── test_chat_api.py            # Chat (5 tests)
└── test_integration_workflows.py  # Workflows (3 tests)
```

## Fixtures Available

- `api_client` - HTTP client
- `auth_tokens` - Auth tokens dict
- `auth_headers` - Auth headers dict
- `test_project` - Pre-created project
- `test_file` - Pre-uploaded file

## Expected Results

✅ All tests pass when:
- Backend server running on http://localhost:8000
- MongoDB accessible
- Redis accessible
- ChromaDB initialized

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Backend not running | `uvicorn app.main:app --reload` |
| Import errors | `pip install -r requirements.txt` |
| Database errors | Check MongoDB connection in `.env` |
| Timeout errors | Increase timeouts in `conftest.py` |

## Test Execution Time

- Total suite: 2-5 minutes
- Individual file: 10-60 seconds
- Single test: 1-10 seconds

## Coverage Goals

- API endpoints: 80%+
- Critical paths: 100%
- Overall: 70%+
