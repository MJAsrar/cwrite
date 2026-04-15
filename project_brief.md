# CoWriteAI - Project Brief

**Description:**
CoWriteAI is an intelligent, AI-assisted writing environment built on a multi-agent architecture, tailored for novelists, scriptwriters, and long-form content creators. It provides writers with an intuitive workspace that deeply understands their story world—including characters, plots, relationships, scenes, timeline, and narrative perspective—and enables effortless retrieval and creative exploration through advanced semantic understanding. The platform employs a system of specialized AI agents that collaboratively index creative projects, automatically extract entities and their relationships, detect scene boundaries and narrative structure, and offer semantic search capabilities rather than traditional keyword matching. It also features an embedded AI assistant, powered by genre-specific Large Language Models via HuggingFace Inference API and Groq, with context-aware RAG (Retrieval-Augmented Generation) for deep story understanding, inline writing suggestions (Copilot), and real-time web research integration.

**Features include:**
- Automated project indexing with async background processing (Celery) for documents (.txt, .md, .docx), including text extraction, chunking, and embedding generation.
- Intelligent entity extraction identifying characters, locations, and themes using spaCy NLP, with LLM-based verification through Groq for accuracy.
- Discovery and mapping of complex relationships (e.g., character-location, character-theme) with interactive relationship visualization.
- Scene and chapter detection with boundary analysis, POV (point-of-view) detection, and timeline extraction with flashback identification.
- Advanced semantic and hybrid search (vector + keyword) allowing natural language queries across project data, with search caching (Redis), saved searches, filters, and analytics.
- Genre-specific AI writing assistance powered by HuggingFace Inference API and Groq, with RAG context assembly for story-aware responses.
- Inline AI Copilot providing context-aware writing suggestions at the cursor position.
- AI-generated edit proposals with diff visualization for reviewing suggested changes.
- Real-time web research integration via Tavily API, injecting external knowledge into AI chat context.
- Rich text editor built on Monaco Editor with formatting controls and file preview.
- Interactive workspace UI featuring a navigation rail, explorer panel, centered editor, AI chat sidebar, entity browser, search modal, and file processing status indicators.
- Secure user authentication with JWT, password hashing (bcrypt), role-based access control, and rate limiting.

**Multi-Agent Architecture:**
CoWriteAI operates as a multi-agent system where each agent is a specialized service responsible for a distinct aspect of story analysis. When a document is uploaded, an orchestrating indexing pipeline triggers the agents in sequence, and their outputs feed into one another to build a rich, interconnected knowledge graph of the writer's story world.

- **Text Extraction Agent** — Parses uploaded files (.txt, .md, .docx), extracts raw text, and splits it into semantically meaningful chunks for downstream processing.
- **Entity Extraction Agent** — Uses spaCy NLP to identify characters, locations, and themes from text, then delegates to the LLM Verification Agent for accuracy validation.
- **LLM Verification Agent** — Sends extracted entities with their context sentences to Groq for verification, classifying each as valid, uncertain, or incorrect to filter out false positives.
- **Relationship Discovery Agent** — Analyzes co-occurrences and contextual proximity between entities to discover and map complex relationships (e.g., character-location, character-theme).
- **Scene Detection Agent** — Identifies chapter and scene boundaries using pattern matching and heuristic analysis, segmenting the narrative into discrete structural units.
- **POV Detection Agent** — Determines the narrative perspective (first person, third person limited/omniscient, mixed) for each scene and detects POV shifts across the text.
- **Timeline Extraction Agent** — Extracts temporal markers, detects flashbacks, reconstructs chronological order, and estimates story duration.
- **Embedding Agent** — Generates vector embeddings for text chunks using Sentence-Transformers, storing them in ChromaDB for semantic similarity search.
- **RAG Context Agent** — Assembles comprehensive context for AI responses by gathering relevant text chunks, entities, relationships, and scene data from across the project.
- **Chat Agent** — Handles conversational AI interactions using genre-specific models (HuggingFace) with Groq fallback, grounded in RAG-assembled story context.
- **Copilot Agent** — Provides inline writing suggestions at the cursor position by analyzing surrounding text and story context through the RAG pipeline.
- **Research Agent** — Performs real-time web searches via Tavily API and injects external knowledge into the AI chat context for research-backed responses.

**Key Words:** 
Multi-Agent System, Named Entity Recognition, Semantic Search, Retrieval-Augmented Generation, Genre-Specific Language Models

**Technologies Used:**
- **Frontend:** Next.js 15, React, TypeScript, Tailwind CSS, Zustand, GSAP, Framer Motion, Monaco Editor, Recharts, Radix UI, Lucide React
- **Backend:** Python, FastAPI, AsyncIO, Celery, Flower
- **Database & Caching:** MongoDB (Motor), ChromaDB, Redis
- **AI & NLP:** spaCy, Sentence-Transformers, HuggingFace Inference APIs, Groq, Tavily Search API
- **Auth & Security:** JWT (python-jose), passlib/bcrypt, Rate Limiting
- **File Processing:** python-docx, python-magic
- **Dev & Testing:** pytest, Jest, ESLint, structlog

**Supervisor Name:**
Dr. Ali Zeeshan

**Group Members:**
Junaid Asrar 22i-0770
Ayesha Ejaz 22i-0899
Aisha Siddiqa 22i-1281
