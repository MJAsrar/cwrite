@echo off
REM Comprehensive Backend Test Runner for Windows
REM This script runs the comprehensive semantic search and indexing tests

setlocal enabledelayedexpansion

echo ========================================
echo CoWriteAI Backend Test Runner (Windows)
echo ========================================
echo.

REM Check if we're in the backend directory
if not exist "test_comprehensive_search_indexing.py" (
    echo Error: Please run this script from the backend directory
    echo Usage: cd backend ^&^& run_test.bat
    exit /b 1
)

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    exit /b 1
)

echo [OK] Python is installed
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo     Version: %PYTHON_VERSION%

REM Check if MongoDB is accessible
echo.
echo Checking MongoDB connection...

python -c "from pymongo import MongoClient; MongoClient('mongodb://localhost:27017', serverSelectionTimeoutMS=2000).admin.command('ping')" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] MongoDB is not accessible at mongodb://localhost:27017
    echo.
    echo Please ensure MongoDB is running:
    echo   Option 1: docker-compose up -d mongodb
    echo   Option 2: Start local MongoDB service
    echo.
    exit /b 1
)

echo [OK] MongoDB is accessible

REM Check if spaCy model is installed
echo.
echo Checking spaCy model...

python -c "import spacy; spacy.load('en_core_web_sm')" >nul 2>&1
if errorlevel 1 (
    echo [WARNING] spaCy English model not found
    echo.
    echo Installing spaCy model...
    python -m spacy download en_core_web_sm
    
    if errorlevel 1 (
        echo [ERROR] Failed to install spaCy model
        exit /b 1
    )
    echo [OK] spaCy model installed
) else (
    echo [OK] spaCy model is installed
)

REM Check if required packages are installed
echo.
echo Checking required packages...

set MISSING_PACKAGES=
for %%p in (sentence-transformers pymongo motor pydantic) do (
    python -c "import %%p" >nul 2>&1
    if errorlevel 1 (
        set MISSING_PACKAGES=!MISSING_PACKAGES! %%p
    )
)

if not "!MISSING_PACKAGES!"=="" (
    echo [WARNING] Missing packages:!MISSING_PACKAGES!
    echo.
    echo Installing missing packages...
    python -m pip install!MISSING_PACKAGES!
    
    if errorlevel 1 (
        echo [ERROR] Failed to install packages
        echo Please run: pip install -r requirements.txt
        exit /b 1
    )
) else (
    echo [OK] All required packages are installed
)

REM Run the test
echo.
echo ========================================
echo Running Comprehensive Tests
echo ========================================
echo.

python test_comprehensive_search_indexing.py

set TEST_EXIT_CODE=%errorlevel%

echo.

REM Print result
if %TEST_EXIT_CODE% equ 0 (
    echo ========================================
    echo [SUCCESS] ALL TESTS PASSED
    echo ========================================
) else (
    echo ========================================
    echo [FAILED] TESTS FAILED
    echo ========================================
    echo.
    echo Please check the error messages above.
    echo See TEST_INSTRUCTIONS.md for troubleshooting.
)

exit /b %TEST_EXIT_CODE%




