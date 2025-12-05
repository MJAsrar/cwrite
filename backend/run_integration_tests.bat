@echo off
REM Windows batch script to run API integration tests

echo ========================================
echo CoWriteAI API Integration Tests
echo ========================================
echo.

REM Check if virtual environment exists
if not exist "venv\" (
    echo Error: Virtual environment not found!
    echo Please run: python -m venv venv
    exit /b 1
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Check if pytest is installed
python -c "import pytest" 2>nul
if errorlevel 1 (
    echo Installing test dependencies...
    pip install pytest pytest-asyncio httpx python-dotenv
)

REM Check if backend server is running
echo Checking if backend server is running...
curl -s http://localhost:8000/health >nul 2>&1
if errorlevel 1 (
    echo.
    echo WARNING: Backend server is not running!
    echo Please start the backend server first:
    echo   cd backend
    echo   uvicorn app.main:app --reload
    echo.
    pause
    exit /b 1
)

echo Backend server is running.
echo.

REM Run tests
echo Running integration tests...
echo.

REM Run all tests with verbose output
pytest tests/ -v --tb=short --color=yes

REM Check test result
if errorlevel 1 (
    echo.
    echo ========================================
    echo TESTS FAILED
    echo ========================================
    exit /b 1
) else (
    echo.
    echo ========================================
    echo ALL TESTS PASSED
    echo ========================================
)

pause
