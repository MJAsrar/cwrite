# Test Execution Checklist

Use this checklist before running integration tests to ensure everything is properly configured.

## Pre-Test Setup

### ☐ 1. Environment Setup
- [ ] Python 3.8+ installed
- [ ] Virtual environment created (`python -m venv venv`)
- [ ] Virtual environment activated
- [ ] Dependencies installed (`pip install -r requirements.txt`)

### ☐ 2. Database Services
- [ ] MongoDB is running and accessible
- [ ] Redis is running and accessible
- [ ] ChromaDB is initialized
- [ ] Database connections tested

### ☐ 3. Configuration
- [ ] `.env` file exists in backend directory
- [ ] `DATABASE_URL` is configured
- [ ] `REDIS_URL` is configured
- [ ] `SECRET_KEY` is set
- [ ] All required environment variables are set

### ☐ 4. Backend Server
- [ ] Backend server starts without errors
- [ ] Server is accessible at http://localhost:8000
- [ ] Health endpoint responds: `curl http://localhost:8000/health`
- [ ] API docs accessible (if DEBUG=true): http://localhost:8000/docs

## Running Tests

### ☐ 5. Test Execution
- [ ] Navigate to backend directory: `cd backend`
- [ ] Run test script:
  - Windows: `run_integration_tests.bat`
  - Linux/Mac: `./run_integration_tests.sh`
- [ ] Or run manually: `pytest tests/ -v`

### ☐ 6. Monitor Results
- [ ] All tests pass (green)
- [ ] No errors in test output
- [ ] No warnings about missing dependencies
- [ ] Execution time is reasonable (2-5 minutes)

## Post-Test Verification

### ☐ 7. Review Results
- [ ] Check test summary (X passed, 0 failed)
- [ ] Review any warnings or skipped tests
- [ ] Check backend logs for errors
- [ ] Verify test data was cleaned up

### ☐ 8. Coverage (Optional)
- [ ] Run with coverage: `pytest tests/ --cov=app --cov-report=html`
- [ ] Open coverage report: `htmlcov/index.html`
- [ ] Verify coverage meets targets (80%+ for API endpoints)

## Troubleshooting

### If Tests Fail

#### ☐ Backend Issues
- [ ] Check backend server is running
- [ ] Review backend logs for errors
- [ ] Verify all services (MongoDB, Redis) are accessible
- [ ] Check environment variables

#### ☐ Database Issues
- [ ] Test MongoDB connection
- [ ] Test Redis connection
- [ ] Check database credentials
- [ ] Verify database is not full

#### ☐ Test Issues
- [ ] Check test logs for specific errors
- [ ] Run failing test individually: `pytest tests/test_file.py::TestClass::test_name -v`
- [ ] Enable debug logging: `pytest tests/ -v --log-cli-level=DEBUG`
- [ ] Check if test data needs cleanup

#### ☐ Dependency Issues
- [ ] Reinstall dependencies: `pip install -r requirements.txt --force-reinstall`
- [ ] Check Python version: `python --version`
- [ ] Verify virtual environment is activated

## Quick Commands Reference

```bash
# Start backend
uvicorn app.main:app --reload

# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/test_auth_api.py -v

# Run with coverage
pytest tests/ --cov=app --cov-report=html

# Run with debug logging
pytest tests/ -v --log-cli-level=DEBUG

# Stop on first failure
pytest tests/ -x

# Run last failed tests only
pytest tests/ --lf
```

## Success Criteria

✅ **Tests Pass When:**
- All 60+ tests show PASSED status
- No FAILED or ERROR status
- Execution completes in 2-5 minutes
- No critical warnings
- Backend logs show no errors
- Test data is cleaned up

## Expected Output

```
================================ test session starts =================================
platform win32 -- Python 3.10.0, pytest-7.4.3, pluggy-1.3.0
rootdir: C:\project\backend
configfile: pytest.ini
plugins: asyncio-0.21.1, cov-4.1.0
collected 60 items

tests/test_health.py::TestSystemHealth::test_root_endpoint PASSED           [  1%]
tests/test_health.py::TestSystemHealth::test_health_check PASSED            [  3%]
tests/test_health.py::TestSystemHealth::test_api_docs_available PASSED      [  5%]
tests/test_auth_api.py::TestAuthenticationAPI::test_register_new_user PASSED [  8%]
...
tests/test_integration_workflows.py::TestCompleteWorkflows::test_complete_project_workflow PASSED [100%]

================================ 60 passed in 180.52s ================================
```

## Notes

- Tests create and clean up their own data
- Test user credentials are auto-generated
- Each test is isolated and independent
- Tests can be run in any order
- Safe to run multiple times

## Next Steps After Success

1. ✅ Phase 1 Complete: API Integration Tests Pass
2. 📝 Document any issues found
3. 🔄 Set up CI/CD integration
4. 📊 Review coverage report
5. 🚀 Move to Phase 2: Unit Tests

---

**Last Updated**: December 2024
**Test Suite Version**: 1.0
**Total Tests**: 60+
**Expected Duration**: 2-5 minutes
