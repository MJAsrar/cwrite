#!/bin/bash

# Comprehensive Backend Test Runner
# This script runs the comprehensive semantic search and indexing tests

set -e  # Exit on error

echo "========================================"
echo "CoWriteAI Backend Test Runner"
echo "========================================"
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the backend directory
if [ ! -f "test_comprehensive_search_indexing.py" ]; then
    echo -e "${RED}Error: Please run this script from the backend directory${NC}"
    echo "Usage: cd backend && ./run_test.sh"
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is not installed${NC}"
    exit 1
fi

PYTHON_CMD=python3
if command -v python &> /dev/null; then
    PYTHON_VERSION=$(python --version 2>&1 | grep -oP '\d+\.\d+')
    if [[ $(echo "$PYTHON_VERSION >= 3.8" | bc -l) -eq 1 ]]; then
        PYTHON_CMD=python
    fi
fi

echo -e "${GREEN}✓${NC} Using Python: $PYTHON_CMD"

# Check if MongoDB is accessible
echo -e "\n${YELLOW}Checking MongoDB connection...${NC}"

# Try to connect to MongoDB
if ! $PYTHON_CMD -c "from pymongo import MongoClient; MongoClient('mongodb://localhost:27017', serverSelectionTimeoutMS=2000).admin.command('ping')" 2>/dev/null; then
    echo -e "${RED}✗ MongoDB is not accessible at mongodb://localhost:27017${NC}"
    echo ""
    echo "Please ensure MongoDB is running:"
    echo "  Option 1: docker-compose up -d mongodb"
    echo "  Option 2: Start local MongoDB service"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓${NC} MongoDB is accessible"

# Check if spaCy model is installed
echo -e "\n${YELLOW}Checking spaCy model...${NC}"

if ! $PYTHON_CMD -c "import spacy; spacy.load('en_core_web_sm')" 2>/dev/null; then
    echo -e "${RED}✗ spaCy English model not found${NC}"
    echo ""
    echo "Installing spaCy model..."
    $PYTHON_CMD -m spacy download en_core_web_sm
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} spaCy model installed"
    else
        echo -e "${RED}✗ Failed to install spaCy model${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓${NC} spaCy model is installed"
fi

# Check if required packages are installed
echo -e "\n${YELLOW}Checking required packages...${NC}"

REQUIRED_PACKAGES=("sentence-transformers" "pymongo" "motor" "pydantic")
MISSING_PACKAGES=()

for package in "${REQUIRED_PACKAGES[@]}"; do
    if ! $PYTHON_CMD -c "import ${package//-/_}" 2>/dev/null; then
        MISSING_PACKAGES+=("$package")
    fi
done

if [ ${#MISSING_PACKAGES[@]} -ne 0 ]; then
    echo -e "${RED}✗ Missing packages: ${MISSING_PACKAGES[*]}${NC}"
    echo ""
    echo "Installing missing packages..."
    $PYTHON_CMD -m pip install "${MISSING_PACKAGES[@]}"
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}✗ Failed to install packages${NC}"
        echo "Please run: pip install -r requirements.txt"
        exit 1
    fi
else
    echo -e "${GREEN}✓${NC} All required packages are installed"
fi

# Run the test
echo ""
echo "========================================"
echo "Running Comprehensive Tests"
echo "========================================"
echo ""

$PYTHON_CMD test_comprehensive_search_indexing.py

# Capture exit code
TEST_EXIT_CODE=$?

echo ""

# Print result
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
    echo -e "${GREEN}========================================${NC}"
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}✗ TESTS FAILED${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo "Please check the error messages above."
    echo "See TEST_INSTRUCTIONS.md for troubleshooting."
fi

exit $TEST_EXIT_CODE




