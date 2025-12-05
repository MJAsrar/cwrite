#!/bin/bash
# Shell script to run API integration tests

echo "========================================"
echo "CoWriteAI API Integration Tests"
echo "========================================"
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Error: Virtual environment not found!"
    echo "Please run: python -m venv venv"
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

# Check if pytest is installed
python -c "import pytest" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "Installing test dependencies..."
    pip install pytest pytest-asyncio httpx python-dotenv
fi

# Check if backend server is running
echo "Checking if backend server is running..."
if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo ""
    echo "WARNING: Backend server is not running!"
    echo "Please start the backend server first:"
    echo "  cd backend"
    echo "  uvicorn app.main:app --reload"
    echo ""
    exit 1
fi

echo "Backend server is running."
echo ""

# Run tests
echo "Running integration tests..."
echo ""

# Run all tests with verbose output
pytest tests/ -v --tb=short --color=yes

# Check test result
if [ $? -ne 0 ]; then
    echo ""
    echo "========================================"
    echo "TESTS FAILED"
    echo "========================================"
    exit 1
else
    echo ""
    echo "========================================"
    echo "ALL TESTS PASSED"
    echo "========================================"
fi
