# CoWriteAI Platform Makefile

.PHONY: help install dev build test clean docker-dev docker-prod

# Default target
help:
	@echo "CoWriteAI Platform Development Commands"
	@echo "======================================"
	@echo "install     - Install all dependencies"
	@echo "dev         - Start development servers"
	@echo "build       - Build production assets"
	@echo "test        - Run all tests"
	@echo "clean       - Clean build artifacts"
	@echo "docker-dev  - Start development with Docker"
	@echo "docker-prod - Start production with Docker"
	@echo "lint        - Run linting and formatting"

# Install dependencies
install:
	@echo "Installing frontend dependencies..."
	npm install
	@echo "Installing backend dependencies..."
	cd backend && pip install -r requirements.txt
	@echo "Downloading spaCy model..."
	python -m spacy download en_core_web_sm

# Development servers
dev:
	@echo "Starting development servers..."
	@echo "Backend will start on http://localhost:8000"
	@echo "Frontend will start on http://localhost:3000"
	@make -j2 dev-backend dev-frontend

dev-backend:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	npm run dev

# Build production
build:
	@echo "Building frontend..."
	npm run build
	@echo "Build completed!"

# Run tests
test:
	@echo "Running frontend tests..."
	npm run test
	@echo "Running backend tests..."
	cd backend && pytest
	@echo "All tests completed!"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf .next/
	rm -rf dist/
	rm -rf build/
	rm -rf backend/__pycache__/
	rm -rf backend/**/__pycache__/
	@echo "Clean completed!"

# Docker development
docker-dev:
	@echo "Starting development environment with Docker..."
	docker-compose -f docker-compose.dev.yml up --build

# Docker production
docker-prod:
	@echo "Starting production environment with Docker..."
	docker-compose up --build -d

# Linting and formatting
lint:
	@echo "Running frontend linting..."
	npm run lint
	@echo "Running backend linting..."
	cd backend && black . && isort . && flake8 .

# Database setup
db-setup:
	@echo "Setting up development database..."
	docker-compose -f docker-compose.dev.yml up -d mongo redis
	@echo "Database services started!"

# Stop all services
stop:
	@echo "Stopping all services..."
	docker-compose -f docker-compose.dev.yml down
	docker-compose down

# View logs
logs:
	docker-compose -f docker-compose.dev.yml logs -f

# Reset development environment
reset:
	@echo "Resetting development environment..."
	docker-compose -f docker-compose.dev.yml down -v
	docker system prune -f
	@echo "Environment reset completed!"