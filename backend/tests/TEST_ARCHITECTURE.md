# Test Architecture Overview

## Test Pyramid

```
                    ╔═══════════════════╗
                    ║   E2E Tests       ║  ← Phase 4 (Future)
                    ║   (Playwright)    ║
                    ╚═══════════════════╝
                  ╔═══════════════════════╗
                  ║  Integration Tests    ║  ← Phase 1 (Current)
                  ║  (API Black-Box)      ║
                  ╚═══════════════════════╝
              ╔═══════════════════════════════╗
              ║      Unit Tests               ║  ← Phase 2 (Next)
              ║      (White-Box)              ║
              ╚═══════════════════════════════╝
```

## Phase 1: API Integration Tests (Current Implementation)

### Test Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Test Execution Flow                      │
└─────────────────────────────────────────────────────────────┘

1. Setup Phase (conftest.py)
   ├── Create HTTP Client
   ├── Register/Login Test User
   ├── Get Auth Tokens
   └── Create Test Fixtures

2. Test Execution
   ├── Health Tests ──────────┐
   ├── Auth Tests ────────────┤
   ├── Project Tests ─────────┤──→ API Endpoints
   ├── File Tests ────────────┤
   ├── Search Tests ──────────┤
   ├── Chat Tests ────────────┤
   └── Workflow Tests ────────┘

3. Cleanup Phase
   ├── Delete Test Projects
   ├── Delete Test Files
   └── Close Connections
```

### Component Interaction

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│              │  HTTP   │              │  Calls  │              │
│  Test Suite  │────────→│  FastAPI     │────────→│  Services    │
│  (pytest)    │         │  Endpoints   │         │  & Repos     │
│              │←────────│              │←────────│              │
└──────────────┘  JSON   └──────────────┘  Data   └──────────────┘
                                                           │
                                                           ↓
                                                   ┌──────────────┐
                                                   │  Databases   │
                                                   │  - MongoDB   │
                                                   │  - Redis     │
                                                   │  - ChromaDB  │
                                                   └──────────────┘
```

## Test File Organization

```
backend/tests/
│
├── conftest.py                    # Shared fixtures & configuration
│   ├── api_client                 # HTTP client fixture
│   ├── auth_tokens                # Authentication fixture
│   ├── auth_headers               # Authorization headers
│   ├── test_project               # Project fixture (auto-cleanup)
│   └── test_file                  # File fixture (auto-cleanup)
│
├── test_health.py                 # System health checks
│   └── TestSystemHealth
│       ├── test_root_endpoint
│       ├── test_health_check
│       └── test_api_docs_available
│
├── test_auth_api.py               # Authentication & authorization
│   └── TestAuthenticationAPI
│       ├── test_register_new_user
│       ├── test_register_duplicate_email
│       ├── test_login_valid_credentials
│       ├── test_login_invalid_credentials
│       ├── test_get_current_user
│       ├── test_logout
│       └── test_refresh_token
│
├── test_projects_api.py           # Project management
│   └── TestProjectsAPI
│       ├── test_create_project
│       ├── test_list_projects
│       ├── test_get_project
│       ├── test_update_project
│       ├── test_delete_project
│       └── test_project_isolation
│
├── test_files_api.py              # File operations
│   └── TestFilesAPI
│       ├── test_upload_file
│       ├── test_list_project_files
│       ├── test_get_file_metadata
│       ├── test_get_file_content
│       ├── test_update_file_content
│       ├── test_delete_file
│       └── test_file_access_control
│
├── test_search_api.py             # Search & embeddings
│   └── TestSearchAPI
│       ├── test_semantic_search
│       ├── test_hybrid_search
│       ├── test_generate_embedding
│       ├── test_calculate_similarity
│       └── test_find_similar_content
│
├── test_chat_api.py               # Chat/AI assistant
│   └── TestChatAPI
│       ├── test_send_chat_message
│       ├── test_chat_with_context
│       └── test_chat_conversation_history
│
└── test_integration_workflows.py # End-to-end workflows
    └── TestCompleteWorkflows
        ├── test_complete_project_workflow
        ├── test_file_update_workflow
        └── test_multi_file_search_workflow
```

## Test Execution Sequence

### Example: Complete Project Workflow Test

```
┌─────────────────────────────────────────────────────────────┐
│  test_complete_project_workflow()                            │
└─────────────────────────────────────────────────────────────┘

Step 1: Register User
   POST /api/v1/auth/register
   ↓
   ✓ User created
   ✓ Tokens received

Step 2: Create Project
   POST /api/v1/projects/
   ↓
   ✓ Project created
   ✓ Project ID received

Step 3: Upload File
   POST /api/v1/files/projects/{id}/files/upload
   ↓
   ✓ File uploaded
   ✓ Processing started

Step 4: Wait for Processing
   GET /api/v1/files/files/{id}/processing-status
   ↓
   ✓ Processing completed

Step 5: Search Content
   POST /api/v1/search/search
   ↓
   ✓ Results returned
   ✓ Content indexed

Step 6: Get Statistics
   GET /api/v1/files/projects/{id}/files/stats
   ↓
   ✓ Stats retrieved

Step 7: Delete File
   DELETE /api/v1/files/files/{id}
   ↓
   ✓ File deleted
   ✓ Cascade delete completed

Step 8: Delete Project
   DELETE /api/v1/projects/{id}
   ↓
   ✓ Project deleted

Step 9: Logout
   POST /api/v1/auth/logout
   ↓
   ✓ User logged out
```

## Fixture Dependency Graph

```
                    ┌──────────────┐
                    │  api_client  │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ auth_tokens  │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ auth_headers │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ test_project │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  test_file   │
                    └──────────────┘
```

## Test Data Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    Test Data Lifecycle                       │
└─────────────────────────────────────────────────────────────┘

Session Start
   │
   ├─→ Create Test User (once per session)
   │   └─→ Reused across all tests
   │
Test Start
   │
   ├─→ Create Test Project (per test)
   │   └─→ Isolated to this test
   │
   ├─→ Upload Test File (per test)
   │   └─→ Isolated to this test
   │
   ├─→ Run Test Logic
   │   └─→ Make API calls
   │       └─→ Verify responses
   │
Test End
   │
   ├─→ Delete Test File (automatic)
   │
   ├─→ Delete Test Project (automatic)
   │
Session End
   │
   └─→ Test User remains (for reuse)
```

## API Coverage Map

```
┌─────────────────────────────────────────────────────────────┐
│                      API Endpoints                           │
└─────────────────────────────────────────────────────────────┘

/api/v1/auth/
   ├── POST   /register          ✓ Tested
   ├── POST   /login             ✓ Tested
   ├── POST   /logout            ✓ Tested
   ├── POST   /refresh           ✓ Tested
   ├── GET    /me                ✓ Tested
   ├── POST   /forgot-password   ○ Not tested (email required)
   └── POST   /reset-password    ○ Not tested (email required)

/api/v1/projects/
   ├── GET    /                  ✓ Tested
   ├── POST   /                  ✓ Tested
   ├── GET    /{id}              ✓ Tested
   ├── PUT    /{id}              ✓ Tested
   └── DELETE /{id}              ✓ Tested

/api/v1/files/
   ├── POST   /projects/{id}/files/upload        ✓ Tested
   ├── GET    /projects/{id}/files               ✓ Tested
   ├── GET    /projects/{id}/files/stats         ✓ Tested
   ├── GET    /files/{id}                        ✓ Tested
   ├── GET    /files/{id}/content                ✓ Tested
   ├── GET    /files/{id}/processing-status      ✓ Tested
   ├── PUT    /files/{id}                        ✓ Tested
   ├── DELETE /files/{id}                        ✓ Tested
   └── POST   /files/{id}/reprocess              ✓ Tested

/api/v1/search/
   ├── POST   /search                            ✓ Tested
   ├── POST   /embeddings/generate               ✓ Tested
   ├── POST   /embeddings/similarity             ✓ Tested
   ├── GET    /embeddings/stats                  ✓ Tested
   ├── GET    /autocomplete/{project_id}         ✓ Tested
   ├── GET    /similar/{chunk_id}                ✓ Tested
   ├── GET    /analytics/{project_id}            ○ Not tested
   ├── GET    /performance/{project_id}          ○ Not tested
   └── DELETE /cache/{project_id}                ○ Not tested

/api/v1/chat/
   └── POST   /                                  ✓ Tested

Legend:
   ✓ = Tested
   ○ = Not tested (optional/advanced features)
```

## Test Isolation Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    Test Isolation                            │
└─────────────────────────────────────────────────────────────┘

Each test is isolated through:

1. Unique Test Data
   └─→ Timestamps in names prevent collisions

2. Automatic Cleanup
   └─→ Fixtures delete data after test

3. Independent Execution
   └─→ Tests don't depend on each other

4. Fresh State
   └─→ Each test starts with clean slate

5. Parallel Safe
   └─→ Tests can run in parallel (future)
```

## Error Handling Coverage

```
┌─────────────────────────────────────────────────────────────┐
│                  Error Scenarios Tested                      │
└─────────────────────────────────────────────────────────────┘

Authentication Errors
   ├── 401 Unauthorized (no token)
   ├── 401 Unauthorized (invalid token)
   ├── 401 Unauthorized (wrong password)
   └── 409 Conflict (duplicate email)

Authorization Errors
   ├── 403 Forbidden (wrong user)
   └── 403 Forbidden (no access)

Validation Errors
   ├── 422 Unprocessable Entity (invalid data)
   ├── 400 Bad Request (missing required field)
   └── 400 Bad Request (invalid format)

Resource Errors
   ├── 404 Not Found (non-existent resource)
   └── 409 Conflict (duplicate name)

System Errors
   └── 500 Internal Server Error (handled gracefully)
```

## Performance Characteristics

```
┌─────────────────────────────────────────────────────────────┐
│                  Test Performance                            │
└─────────────────────────────────────────────────────────────┘

Fast Tests (< 1s)
   └─→ Health checks, simple API calls

Medium Tests (1-5s)
   └─→ Auth, projects, basic operations

Slow Tests (5-30s)
   └─→ File upload, processing, search

Very Slow Tests (30s+)
   └─→ Complete workflows, multi-file operations

Total Suite: 2-5 minutes
```

## Future Enhancements

```
Phase 2: Unit Tests
   ├── Service layer tests
   ├── Repository tests
   ├── Utility function tests
   └── Mock external dependencies

Phase 3: Frontend Tests
   ├── Component tests
   ├── Hook tests
   ├── Integration tests
   └── Mock API calls

Phase 4: E2E Tests
   ├── Browser automation
   ├── User journey tests
   ├── Cross-browser tests
   └── Visual regression tests

Phase 5: Performance Tests
   ├── Load testing
   ├── Stress testing
   ├── Spike testing
   └── Endurance testing
```
