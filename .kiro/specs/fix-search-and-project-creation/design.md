# Design Document

## Overview

This design addresses critical functionality issues in the CoWrite AI platform where search functionality fails to load projects and project creation doesn't persist to the database. The root cause analysis reveals that the backend API is missing the projects endpoints that the frontend expects to exist.

## Architecture

### Current State Issues

1. **Missing Projects API Endpoints**: The backend API router (`backend/app/api/v1/api.py`) doesn't include a projects router, but the frontend API client (`src/lib/api.ts`) expects endpoints like `/api/v1/projects`
2. **Search Page Dependency**: The search page tries to load projects via `api.projects.list()` but this endpoint doesn't exist
3. **Project Creation Flow**: The CreateProjectModal calls `onSubmit` which likely tries to call `api.projects.create()` but this endpoint is missing

### Target Architecture

```
Frontend (Next.js)
├── Dashboard Pages
│   ├── Search Page → calls api.projects.list()
│   └── Projects Page → calls api.projects.list(), api.projects.create()
└── API Client (src/lib/api.ts)
    └── projects.* methods

Backend (FastAPI)
├── API Router (api/v1/api.py)
│   └── Include projects router
├── Projects Endpoints (api/v1/endpoints/projects.py) [NEW]
│   ├── GET /projects (list user's projects)
│   ├── POST /projects (create project)
│   ├── GET /projects/{id} (get project)
│   ├── PUT /projects/{id} (update project)
│   └── DELETE /projects/{id} (delete project)
└── Project Repository (repositories/project_repository.py) [EXISTS]
    └── CRUD operations
```

## Components and Interfaces

### 1. Projects API Endpoints (New Component)

**File**: `backend/app/api/v1/endpoints/projects.py`

**Responsibilities**:
- Handle HTTP requests for project CRUD operations
- Validate request data using Pydantic models
- Authenticate users and ensure project ownership
- Return properly formatted responses

**Key Endpoints**:
```python
@router.get("/", response_model=List[ProjectResponse])
async def list_projects(current_user: User = Depends(get_current_user))

@router.post("/", response_model=ProjectResponse)
async def create_project(request: CreateProjectRequest, current_user: User = Depends(get_current_user))

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, current_user: User = Depends(get_current_user))

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, request: UpdateProjectRequest, current_user: User = Depends(get_current_user))

@router.delete("/{project_id}")
async def delete_project(project_id: str, current_user: User = Depends(get_current_user))
```

### 2. API Router Update

**File**: `backend/app/api/v1/api.py`

**Changes**:
- Import the new projects router
- Include projects router with `/projects` prefix

### 3. Frontend Error Handling Enhancement

**Files**: 
- `src/app/dashboard/search/page.tsx`
- `src/components/dashboard/CreateProjectModal.tsx`

**Improvements**:
- Better error messages when API calls fail
- Retry mechanisms for failed requests
- Loading states during API operations
- Proper error boundaries

## Data Models

### Request Models

```python
class CreateProjectRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    settings: Optional[ProjectSettings] = None

class UpdateProjectRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    settings: Optional[ProjectSettings] = None
```

### Response Models

```python
class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    owner_id: str
    created_at: datetime
    updated_at: datetime
    settings: ProjectSettings
    stats: ProjectStats
    indexing_status: IndexingStatus
```

## Error Handling

### Backend Error Handling

1. **Validation Errors**: Return 422 with detailed field validation messages
2. **Authentication Errors**: Return 401 for missing/invalid tokens
3. **Authorization Errors**: Return 403 for accessing other users' projects
4. **Not Found Errors**: Return 404 for non-existent projects
5. **Database Errors**: Return 500 with generic error message, log details

### Frontend Error Handling

1. **Network Errors**: Show retry button and offline message
2. **Authentication Errors**: Redirect to login page
3. **Validation Errors**: Display field-specific error messages
4. **Server Errors**: Show generic error message with support contact

### Error Recovery Strategies

1. **Automatic Retry**: Implement exponential backoff for transient failures
2. **Offline Support**: Cache project list for offline viewing
3. **Optimistic Updates**: Show UI changes immediately, rollback on failure
4. **Graceful Degradation**: Show partial functionality when some features fail

## Testing Strategy

### Backend Testing

1. **Unit Tests**: Test each endpoint with various input scenarios
2. **Integration Tests**: Test full request/response cycle with database
3. **Authentication Tests**: Verify proper user isolation and permissions
4. **Error Handling Tests**: Ensure proper error responses and logging

### Frontend Testing

1. **Component Tests**: Test CreateProjectModal and search page components
2. **API Integration Tests**: Mock API responses and test error handling
3. **User Flow Tests**: Test complete project creation and search workflows
4. **Error Scenario Tests**: Test behavior when API calls fail

### Test Data

1. **Valid Project Data**: Various combinations of name, description, settings
2. **Invalid Data**: Empty names, too long descriptions, invalid characters
3. **Edge Cases**: Unicode characters, special symbols, boundary values
4. **Error Scenarios**: Network failures, server errors, authentication failures

## Implementation Approach

### Phase 1: Backend API Implementation
1. Create projects endpoints file
2. Implement CRUD operations with proper validation
3. Add authentication and authorization
4. Update API router to include projects endpoints

### Phase 2: Frontend Integration
1. Test existing API client methods work with new endpoints
2. Enhance error handling in search page and project creation modal
3. Add loading states and retry mechanisms
4. Improve user feedback for various error scenarios

### Phase 3: Testing and Validation
1. Test project creation flow end-to-end
2. Test search page loads projects correctly
3. Test error scenarios and recovery mechanisms
4. Validate proper data persistence and retrieval

## Security Considerations

1. **Authentication**: All endpoints require valid JWT token
2. **Authorization**: Users can only access their own projects
3. **Input Validation**: Strict validation of all input data
4. **SQL Injection Prevention**: Use parameterized queries (MongoDB is NoSQL but still validate)
5. **Rate Limiting**: Prevent abuse of project creation endpoints
6. **Data Sanitization**: Clean user input to prevent XSS attacks