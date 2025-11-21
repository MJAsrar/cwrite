@echo off
REM CoWriteAI Platform Setup Script for Windows

echo 🚀 Setting up CoWriteAI Platform...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    exit /b 1
)

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python 3 is not installed. Please install Python 3.11+ first.
    exit /b 1
)

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed. Please install Docker first.
    exit /b 1
)

echo ✅ Prerequisites check passed

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install frontend dependencies
    exit /b 1
)

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ❌ Failed to install backend dependencies
    exit /b 1
)

REM Download spaCy model
echo 🤖 Downloading spaCy model...
python -m spacy download en_core_web_sm
if %errorlevel% neq 0 (
    echo ❌ Failed to download spaCy model
    exit /b 1
)

cd ..

REM Copy environment file
if not exist .env.local (
    echo 📝 Creating environment file...
    copy .env.example .env.local
    echo ✅ Created .env.local - please update with your configuration
)

REM Start development services
echo 🐳 Starting development services (MongoDB & Redis)...
docker-compose -f docker-compose.dev.yml up -d mongo redis
if %errorlevel% neq 0 (
    echo ❌ Failed to start development services
    exit /b 1
)

echo.
echo 🎉 Setup completed successfully!
echo.
echo To start the development servers:
echo   Backend:  cd backend ^&^& uvicorn app.main:app --reload
echo   Frontend: npm run dev
echo.
echo Or use the Makefile:
echo   make dev
echo.
echo Access the application:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo.