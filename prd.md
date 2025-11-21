# 🧠 CoWriteAI — Product Requirements Document (PRD)

## 1. Overview

**CoWriteAI** is an AI-assisted writing environment designed for novelists, scriptwriters, and long-form content creators.
The MVP (Phase 1) focuses on **Project Indexing** and **Semantic Search**, forming the foundation for advanced features like Dialogue Generation, Gap Analysis, and Context-Aware Writing Assistance.

The system allows writers to upload and manage creative projects, automatically index characters, themes, and settings, and search across massive content repositories using semantic intelligence rather than keyword matching.

---

## 2. Product Vision

To empower writers with an intelligent workspace that understands *their story world* — characters, plots, and themes — and enables effortless retrieval and creative exploration through deep semantic understanding.

---

## 3. Target Users

| User Type                        | Description                             | Goals                                                         |
| -------------------------------- | --------------------------------------- | ------------------------------------------------------------- |
| **Novelists / Authors**          | Writers managing large manuscripts      | Find references, recall character traits, maintain continuity |
| **Screenwriters**                | Script writers managing multiple scenes | Track character interactions and locations                    |
| **Editors / Beta Readers**       | Reviewers analyzing manuscripts         | Search entities and relationships semantically                |
| **AI Researchers / Integrators** | Developers building creative tools      | Use CoWriteAI APIs for indexing and retrieval                 |

---

## 4. Core MVP Scope (Phase 1)
make sure its a proper website with a landing page and everything.
Signup & Login with email and password (JWT-based authentication).

Password hashing (using bcrypt or Argon2).

Session persistence via secure HTTP-only cookies.

Forgot password & email verification flow.

Role-based structure (User, Admin for future scalability).

### 4.1 Project Indexing

**Goal:** Automatically analyze and structure creative projects by extracting entities, relationships, and contextual metadata.

#### Functional Requirements

* Upload or sync project files (e.g. `.txt`, `.md`, `.docx`).
* Automatic content parsing and cleaning.
* Chunking documents into semantic segments.
* Entity extraction:

  * Characters (proper nouns, pronouns, aliases)
  * Locations
  * Themes / keywords
* Store entities in MongoDB for search and analysis.
* Relationship discovery (character–location, character–theme).
* Incremental re-indexing on file updates.

#### Technical Requirements

| Component             | Description                                                         |
| --------------------- | ------------------------------------------------------------------- |
| **Backend (FastAPI)** | Handles document uploads, triggers indexing pipeline                |
| **Indexing Pipeline** | Runs async jobs using Celery or background tasks                    |
| **Entity Extraction** | Uses open-source models (spaCy, HuggingFace NER)                    |
| **Embeddings**        | `sentence-transformers/all-MiniLM-L6-v2` for semantic vectorization |
| **Vector DB**         | MongoDB Atlas Vector Search or FAISS                                |
| **File Storage**      | GridFS (Mongo) or local storage for dev                             |
| **Performance Layer** | Caching via Redis; async execution for scalability                  |

#### Data Flow

```
User Upload → FastAPI Upload Endpoint
  → File Service (store + clean text)
  → Indexing Service
      → Text Chunking
      → Embedding Generation
      → Entity Extraction
      → Relationship Mapping
  → MongoDB (Documents, Entities, Vectors)
```

---

### 4.2 Semantic Search

**Goal:** Allow users to search across indexed projects semantically — finding related concepts, not just matching words.

#### Functional Requirements

* Query in natural language (e.g. “show all scenes where John doubts himself”).
* Search across:

  * Documents
  * Characters
  * Themes
  * Locations
* Hybrid search:

  * Semantic embedding similarity
  * Metadata filtering (entity type, chapter, date)
* Autocomplete and real-time suggestions.
* Relevance ranking using cosine similarity.

#### Technical Requirements

| Component              | Description                                               |
| ---------------------- | --------------------------------------------------------- |
| **Frontend (Next.js)** | Search bar with auto-suggestions, filters, and highlights |
| **Backend (FastAPI)**  | `/api/search` endpoint with hybrid retrieval logic        |
| **Vector Store**       | MongoDB vector index for embeddings                       |
| **Embedding Model**    | SentenceTransformers (configurable via env)               |
| **Cache**              | Redis for query caching and autocomplete suggestions      |
| **Relevance Scoring**  | Combines semantic + metadata weights                      |

#### Data Flow

```
User Query → FastAPI Search Endpoint
  → Parse & Embed Query
  → Vector Similarity Search (MongoDB)
  → Entity Filtering + Metadata Ranking
  → Return Top-N Results + Highlights
```

---

## 5. Frontend UX (Next.js)

### Key Pages

| Page                     | Description                                   |
| ------------------------ | --------------------------------------------- |
| **Dashboard**            | Project list, upload buttons, indexing status |
| **Project Workspace**    | Displays files, entities, and relationships   |
| **Search Interface**     | Natural language query input + filters        |
| **Character Repository** | Auto-discovered characters with insights      |
| **Settings**             | Model config, indexing thresholds, API keys   |

### Design Notes

* VS Code–style layout (sidebar for files/entities, main editor pane)
* Dark and light themes
* Realtime status indicators (indexing progress, search activity)
* Lazy loading for large project lists

---

## 6. System Architecture

### High-Level Overview

```
          ┌──────────────────────────────┐
          │           Next.js            │
          │   (Frontend UI & Client)     │
          └──────────────┬───────────────┘
                         │ REST / WebSocket
                         ▼
          ┌──────────────────────────────┐
          │          FastAPI             │
          │   (API Gateway + Services)   │
          ├──────────────────────────────┤
          │  File Service                │
          │  Indexing Service (Async)    │
          │  Entity Discovery Service    │
          │  Search Service (Hybrid)     │
          └──────────────┬───────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │        MongoDB + GridFS      │
          │  (Documents + Vectors + Meta)│
          ├──────────────────────────────┤
          │        Redis (Cache)         │
          └──────────────────────────────┘
```

### Core Services

| Service                 | Responsibility                                       |
| ----------------------- | ---------------------------------------------------- |
| **File Service**        | Handles uploads, file cleaning, and storage          |
| **Indexing Service**    | Manages text chunking, embeddings, entity extraction |
| **Search Service**      | Handles semantic/hybrid search queries               |
| **Performance Service** | Tracks metrics, caching, and system health           |

---

## 7. Data Model (MongoDB)

### Collections

| Collection    | Description                                   |
| ------------- | --------------------------------------------- |
| `projects`    | Project metadata and owner info               |
| `documents`   | Individual files with extracted text chunks   |
| `entities`    | Characters, locations, and themes             |
| `embeddings`  | Vectorized representations of text chunks     |
| `relations`   | Entity-to-entity and entity-to-document links |
| `search_logs` | Query history and relevance metrics           |

### Example Document

```json
{
  "_id": "64e89c1a9a0f",
  "project_id": "proj_001",
  "type": "character",
  "name": "John Wick",
  "mentions": ["Wick", "John"],
  "relationships": ["Continental Hotel"],
  "embedding_vector": [0.123, 0.456, ...]
}
```

---

## 8. Performance and Scalability

| Aspect               | Strategy                                    |
| -------------------- | ------------------------------------------- |
| **Async Processing** | FastAPI background tasks + Celery workers   |
| **Caching**          | Redis with TTL + LRU eviction               |
| **Batch Operations** | Batch embedding and insert for large texts  |
| **Monitoring**       | Custom `/api/performance/metrics` endpoint  |
| **Vector Indexing**  | MongoDB Atlas Vector Search for scalability |

---

## 9. Future Expansion (Phase 2+)

| Feature                              | Description                                       | Dependencies                          |
| ------------------------------------ | ------------------------------------------------- | ------------------------------------- |
| **Dialogue Generation**              | Generate character conversations based on context | Requires LLM integration              |
| **Gap Analysis**                     | Detect missing narrative links                    | Requires project graph and embeddings |
| **Context-Aware Writing Assistance** | Suggest writing improvements                      | LLM + Indexing Data                   |
| **Knowledge Retrieval Agent**        | Conversational retrieval over indexed content     | RAG pipeline integration              |
| **Style Adaptation**                 | Model learns writer’s tone/style                  | Requires writer embeddings            |

Architecture is modular — new microservices can be added (e.g. `ai_service`, `dialogue_service`) without breaking indexing/search core.

---

## 10. Technical Stack Summary

| Layer             | Technology                                            |
| ----------------- | ----------------------------------------------------- |
| **Frontend**      | Next.js 15, TypeScript, Tailwind CSS, Zustand         |
| **Backend**       | FastAPI, Pydantic, AsyncIO, Celery                    |
| **Database**      | MongoDB + GridFS + Vector Search                      |
| **Cache / Queue** | Redis                                                 |
| **AI Models**     | spaCy, HuggingFace Transformers, SentenceTransformers |
| **Auth**          | JWT-based with password hashing (bcrypt / passlib)    |
| **Deployment**    | Docker + Nginx reverse proxy                          |
| **Testing**       | Pytest + Postman API Tests                            |

---

## 11. Milestones

| Phase       | Deliverable                         | Description                                           |
| ----------- | ----------------------------------- | ----------------------------------------------------- |
| **Phase 1** | Indexing + Semantic Search          | Complete core pipelines, APIs, and UI                 |
| **Phase 2** | Entity Repository + Dialogue Module | Add character repository and conversation builder     |
| **Phase 3** | Knowledge Retrieval Agent           | Build RAG-based retrieval and writing assistant       |
| **Phase 4** | Marketplace & API Access            | External developer integration and subscription model |

---

## 12. Success Metrics

| Metric                        | Target          |
| ----------------------------- | --------------- |
| Indexing time per 10k words   | < 3 seconds     |
| Average search latency        | < 250 ms        |
| Accuracy of entity extraction | ≥ 90%           |
| Cache hit rate                | ≥ 80%           |
| API uptime                    | 99.9%           |
| User satisfaction             | ≥ 8/10 (survey) |

---

## 13. Security and Compliance

* JWT-based auth and refresh tokens
* Sanitized uploads (no script or binary files)
* API rate limiting
* Environment variable–based config
* HTTPS-only in production
* Optional encryption of project data

---

## 14. Open Source and Extensibility

* All AI models are open-source (no paid APIs)
* Plug-and-play model configuration via environment variables
* Modular FastAPI architecture — new features can be added as separate routers/services
* Future LLM integration via self-hosted Ollama or OpenHermes


