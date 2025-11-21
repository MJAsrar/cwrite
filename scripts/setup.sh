#!/bin/bash

# CoWriteAI Platform Setup Script

echo "🚀 Setting up CoWriteAI Platform..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.11+ first."
    exit 1
fi

# Check if Docker is installed


echo "✅ Prerequisites check passed"

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
python3 -m pip install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "❌ Failed to install backend dependencies"
    exit 1
fi

# Download spaCy model
echo "🤖 Downloading spaCy model..."
python3 -m spacy download en_core_web_sm

if [ $? -ne 0 ]; then
    echo "❌ Failed to download spaCy model"
    exit 1
fi

cd ..

# Copy environment file
if [ ! -f .env.local ]; then
    echo "📝 Creating environment file..."
    cp .env.example .env.local
    echo "✅ Created .env.local - please update with your configuration"
fi

# Start development services
echo "🐳 Starting development services (MongoDB & Redis)..."
docker-compose -f docker-compose.dev.yml up -d mongo redis

if [ $? -ne 0 ]; then
    echo "❌ Failed to start development services"
    exit 1
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "To start the development servers:"
echo "  Backend:  cd backend && uvicorn app.main:app --reload"
echo "  Frontend: npm run dev"
echo ""
echo "Or use the Makefile:"
echo "  make dev"
echo ""
echo "Access the application:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo ""