"""
Pytest configuration and fixtures for API integration tests
"""
import pytest
import asyncio
from typing import AsyncGenerator, Dict
from httpx import AsyncClient
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Test configuration
TEST_BASE_URL = os.getenv("TEST_API_URL", "http://localhost:8000")
TEST_USER_EMAIL = "test_user@example.com"
TEST_USER_PASSWORD = "TestPassword123!"


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def api_client() -> AsyncGenerator[AsyncClient, None]:
    """Create an async HTTP client for API testing"""
    async with AsyncClient(base_url=TEST_BASE_URL, timeout=30.0) as client:
        yield client


@pytest.fixture(scope="session")
async def auth_tokens(api_client: AsyncClient) -> Dict[str, str]:
    """
    Register a test user and return authentication tokens
    
    This fixture creates a test user once per test session and returns
    the authentication tokens for use in authenticated requests.
    """
    # Try to register a new user
    register_data = {
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD,
        "confirm_password": TEST_USER_PASSWORD
    }
    
    response = await api_client.post("/api/v1/auth/register", json=register_data)
    
    # If user already exists (409 or 400), login instead
    if response.status_code in [400, 409]:
        login_data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        response = await api_client.post("/api/v1/auth/login", json=login_data)
    
    assert response.status_code in [200, 201], f"Authentication failed: {response.text}"
    
    data = response.json()
    return {
        "access_token": data["tokens"]["access_token"],
        "refresh_token": data["tokens"]["refresh_token"],
        "user_id": data["user"]["id"]
    }


@pytest.fixture
async def auth_headers(auth_tokens: Dict[str, str]) -> Dict[str, str]:
    """Return authorization headers for authenticated requests"""
    return {
        "Authorization": f"Bearer {auth_tokens['access_token']}"
    }


@pytest.fixture
async def test_project(api_client: AsyncClient, auth_headers: Dict[str, str]) -> Dict:
    """
    Create a test project for use in tests
    
    This fixture creates a new project and cleans it up after the test.
    """
    # Create project
    project_data = {
        "name": f"Test Project {asyncio.get_event_loop().time()}",
        "description": "A test project for integration testing"
    }
    
    response = await api_client.post(
        "/api/v1/projects/",
        json=project_data,
        headers=auth_headers
    )
    
    assert response.status_code == 200, f"Project creation failed: {response.text}"
    project = response.json()
    
    yield project
    
    # Cleanup: Delete project after test
    try:
        await api_client.delete(
            f"/api/v1/projects/{project['id']}",
            headers=auth_headers
        )
    except Exception as e:
        print(f"Warning: Failed to cleanup test project: {e}")


@pytest.fixture
async def test_file(
    api_client: AsyncClient,
    auth_headers: Dict[str, str],
    test_project: Dict
) -> Dict:
    """
    Upload a test file to the test project
    
    This fixture uploads a sample text file and cleans it up after the test.
    """
    # Create sample file content
    file_content = """
    Chapter 1: The Beginning
    
    Alice was beginning to get very tired of sitting by her sister on the bank.
    She had nothing to do and was considering whether the pleasure of making a daisy-chain
    would be worth the trouble of getting up and picking the daisies.
    
    Suddenly, a White Rabbit with pink eyes ran close by her. There was nothing so very
    remarkable in that; nor did Alice think it so very much out of the way to hear the
    Rabbit say to itself, "Oh dear! Oh dear! I shall be late!"
    
    Chapter 2: The Pool of Tears
    
    "Curiouser and curiouser!" cried Alice. She was so surprised that for the moment
    she quite forgot how to speak good English. "Now I'm opening out like the largest
    telescope that ever was! Goodbye, feet!"
    """
    
    # Upload file
    files = {
        "file": ("test_story.txt", file_content.encode(), "text/plain")
    }
    
    response = await api_client.post(
        f"/api/v1/projects/{test_project['id']}/files/upload",
        files=files,
        headers=auth_headers
    )
    
    assert response.status_code == 200, f"File upload failed: {response.text}"
    file_data = response.json()
    
    # Wait for processing to complete (with timeout)
    max_wait = 30  # seconds
    wait_interval = 1
    elapsed = 0
    
    while elapsed < max_wait:
        status_response = await api_client.get(
            f"/api/v1/files/{file_data['id']}/processing-status",
            headers=auth_headers
        )
        
        if status_response.status_code == 200:
            status_data = status_response.json()
            if status_data["processing_status"] in ["completed", "failed"]:
                break
        
        await asyncio.sleep(wait_interval)
        elapsed += wait_interval
    
    yield file_data
    
    # Cleanup: Delete file after test
    try:
        await api_client.delete(
            f"/api/v1/files/{file_data['id']}",
            headers=auth_headers
        )
    except Exception as e:
        print(f"Warning: Failed to cleanup test file: {e}")
