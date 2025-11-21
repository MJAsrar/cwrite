# CoWriteAI Platform

AI-Assisted Writing Platform with Intelligent Project Indexing and Semantic Search

## Overview

CoWriteAI is a full-stack web application designed for novelists, scriptwriters, and long-form content creators. The platform provides intelligent project indexing and semantic search capabilities, allowing writers to upload creative projects, automatically extract and index characters, themes, and settings, and perform semantic searches across their content repositories.

## Features

- **User Authentication**: Secure JWT-based authentication with session management
- **Project Management**: Create and organize writing projects with file uploads
- **Intelligent Indexing**: Automatic extraction of characters, locations, and themes
- **Semantic Search**: Natural language search across content using AI embeddings
- **Entity Repository**: Browse and explore discovered story elements
- **Responsive Design**: Modern UI with dark/light theme support

## Technology Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Zustand** - Lightweight state management

### Backend
- **FastAPI** - High-performance Python API framework
- **MongoDB Atlas** - Document database with GridFS and vector search
- **Redis** - Caching and session management
- **Celery** - Background task processing

### AI/ML
- **spaCy** - Natural language processing for entity extraction
- **SentenceTransformers** - Text embeddings for semantic search
- **HuggingFace** - Pre-trained transformer models

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Docker and Docker Compose
- MongoDB Atlas account (or local MongoDB)
- Redis instance

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cowrite-ai-platform
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Start development services**
   ```bash
   # Start MongoDB and Redis
   docker-compose -f docker-compose.dev.yml up -d mongo redis
   
   # Install frontend dependencies
   npm install
   
   # Install backend dependencies
   cd backend
   pip install -r requirements.txt
   python -m spacy download en_core_web_sm
   ```

4. **Run the application**
   ```bash
   # Terminal 1: Start backend
   cd backend
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   
   # Terminal 2: Start frontend
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Docker Development

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

## Project Structure

```
cowrite-ai-platform/
├── src/                    # Frontend source code
│   ├── app/               # Next.js App Router pages
│   ├── components/        # React components
│   ├── lib/              # Utility functions
│   ├── hooks/            # Custom React hooks
│   ├── store/            # Zustand stores
│   └── types/            # TypeScript type definitions
├── backend/               # Backend source code
│   ├── app/              # FastAPI application
│   │   ├── api/          # API routes
│   │   ├── core/         # Core functionality
│   │   ├── models/       # Data models
│   │   ├── services/     # Business logic
│   │   └── utils/        # Utility functions
│   └── requirements.txt  # Python dependencies
├── docker/               # Docker configuration
├── .env.example          # Environment variables template
└── docker-compose.yml    # Production Docker setup
```

## Environment Variables

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=CoWriteAI
```

### Backend (.env)
```env
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/cowrite_ai
REDIS_URL=redis://localhost:6379
SECRET_KEY=your-super-secret-jwt-key
```

See `.env.example` for complete configuration options.

## API Documentation

The FastAPI backend automatically generates interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Testing

### Backend Comprehensive Test Suite

We provide a comprehensive test suite that validates all semantic search and indexing functionality in a single test file.

**Quick Test:**
```bash
cd backend

# Linux/Mac
./run_test.sh

# Windows
run_test.bat

# Or run directly with Python
python test_comprehensive_search_indexing.py
```

**What It Tests:**
- ✅ Database connectivity
- ✅ Project and file management
- ✅ Text extraction and chunking
- ✅ Entity extraction (characters, locations, themes)
- ✅ Embedding generation with sentence-transformers
- ✅ Semantic search with vector similarity
- ✅ Relationship discovery between entities
- ✅ Search analytics and performance metrics
- ✅ Similar content discovery
- ✅ **ChromaDB vector search** (works locally without MongoDB Atlas!) 🆕

**Test Duration:** ~60 seconds (first run may take longer due to model downloads)

**Documentation:**
- `backend/TEST_INSTRUCTIONS.md` - Setup and troubleshooting
- `backend/TEST_SUMMARY.md` - Quick reference
- `backend/CHROMADB_INTEGRATION.md` - ChromaDB vector search integration 🆕

### Other Test Files

```bash
# Test embedding service only
python backend/test_embedding_integration.py

# Test async indexing
python backend/test_async_indexing.py

# Test relationship discovery
python backend/test_relationship_discovery.py
```

## Development Workflow

1. **Requirements**: Define feature requirements in EARS format
2. **Design**: Create technical design documents
3. **Implementation**: Follow task-based development approach
4. **Testing**: Unit, integration, and end-to-end tests
5. **Deployment**: Docker-based deployment pipeline

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions and support, please open an issue in the GitHub repository.