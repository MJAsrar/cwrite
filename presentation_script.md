# CoWriteAI - Technical Presentation Script
*3-Minute Presentation for Project Demo*

---

## Introduction (15 seconds)
Good [morning/afternoon]! Today I'll present CoWriteAI, an AI-assisted writing platform that helps novelists and scriptwriters maintain consistency across large creative projects. I'll focus on three key features, our architectural approach, and how we handle non-functional requirements.

---

## Part 1: Advanced AI Features (3 minutes)

### Gap Analysis & Plot Hole Detection (60 seconds)
Our gap analysis system operates through a sophisticated multi-layered approach. Let me walk you through the technical architecture.

**Layer 1: Semantic Timeline Construction**  
First, we use **ChromaDB vector embeddings** powered by the `all-MiniLM-L6-v2` model to create 384-dimensional vector representations of every scene and event in your story. These vectors capture semantic meaning, not just keywords. We store them in ChromaDB's persistent collections with metadata including chapter number, timestamp, and participating entities.

**Layer 2: Entity Knowledge Tracking**  
We build a dynamic knowledge graph where each node represents a character, and edges represent information flow. When Character A learns something in Scene X, we create a timestamped knowledge edge. Our gap detection algorithm then traverses this graph chronologically.

For example, if Chapter 3 has dialogue where Sarah references "the secret about the vault," but our knowledge graph shows Sarah didn't witness the vault revelation until Chapter 5, the system computes the temporal distance and flags this as a **knowledge continuity violation**. We use graph traversal algorithms to trace information propagation paths.

**Layer 3: Plot Mismatch Detection**  
The technical implementation uses **cosine similarity comparisons** between scene embeddings. Here's how it works: for sequential scenes featuring the same location or character, we expect high similarity (above 0.7). When similarity drops below our threshold of 0.3 between consecutive scenes with shared entities, it indicates a narrative discontinuity—something changed dramatically without explanation.

We also detect **plot thread abandonment** by tracking entity mentions across chapters. If a major character or theme appears frequently in chapters 1-5, disappears in 6-10, then suddenly reappears in chapter 11, our frequency analysis algorithm flags this gap for review.

The system generates a detailed gap report with specific line references, similarity scores, and suggested resolution strategies, all powered by our indexing pipeline.

### Advanced Style Adaptation (60 seconds)
Style adaptation is one of our most sophisticated features, operating at three distinct levels.

**Level 1: Global Author Voice Analysis**  
Our `_analyze_writing_style()` function performs deep linguistic analysis. It extracts point-of-view by analyzing pronoun distributions, determines tense through verb pattern recognition, identifies formality levels by detecting contractions and colloquialisms, and measures sentence complexity through average word count and subordinate clause frequency.

But we go deeper. We also analyze **lexical density**—the ratio of unique words to total words, which indicates vocabulary richness. We compute **rhythm patterns** by measuring clause length variance. All these metrics create a multi-dimensional style fingerprint that's stored as project metadata.

**Level 2: Character-Specific Dialogue Generation**  
For each character, we maintain isolated embedding collections of their dialogue. When generating new dialogue for Character A, our RAG pipeline retrieves the top-5 most semantically similar past utterances from that character's collection.

We then extract **character-specific linguistic patterns**: their average sentence length, their unique vocabulary preferences, their emotional tone distribution (we classify each line as assertive, questioning, emotional, etc.), and even punctuation habits—does this character use exclamation points frequently?

This character profile feeds into our LLM prompt template. The prompt includes explicit instructions like "This character uses short, abrupt sentences averaging 8 words" or "They frequently use metaphors related to sailing." This ensures generated dialogue sounds authentically like that character.

**Level 3: Contextual Style Matching**  
Beyond global and character-level adaptation, we perform **scene-level style matching**. If the current scene is a tense confrontation, our RAG service retrieves similar high-tension scenes from earlier in your manuscript. The LLM then mirrors the pacing, sentence rhythm, and descriptive density of those scenes.

This is implemented through weighted embeddings where we boost similarity scores for scenes with matching emotional tone metadata, creating more contextually appropriate suggestions.

### Context-Aware Writing Assistance (60 seconds)
This feature is fully operational and represents the integration point of all our AI capabilities.

**Real-Time Context Assembly**  
When you position your cursor mid-sentence, our `copilot_service.py` immediately springs into action. The `generate_suggestion()` method extracts the last 500 characters before your cursor as immediate context. This text is then sent through multiple parallel processing pipelines.

**Multi-Source Context Gathering**  
The `_gather_story_context()` method orchestrates five simultaneous queries:

1. **Entity Recognition**: We scan the immediate context for character names, including aliases. If the text mentions "Wick," our entity repository knows this refers to "John Wick" and retrieves his full character profile with attributes like profession, personality traits, and relationships.

2. **Location Detection**: We identify the current setting by matching location entity names against the text. This tells us whether we're in "The Continental Hotel" or "New York Streets," which influences suggestion tone and available action possibilities.

3. **Semantic Style Retrieval**: Using our embedding service's `semantic_search()` with a minimum similarity threshold of 0.3, we find the 3 most stylistically similar passages from your existing manuscript. These become style reference examples.

4. **Recent Events Extraction**: We parse the last paragraph to understand what just happened narratively, providing cause-and-effect continuity.

5. **Style Characteristic Analysis**: We run real-time analysis on your recent writing to detect current POV, tense, and formality, ensuring suggestions match your immediate context.

**Intelligent Prompt Construction**  
All this gathered context flows into `_build_prompt()`, which constructs a sophisticated LLM prompt. The prompt includes character details with their attributes in parentheses, the current location, active themes, explicit style guidelines extracted from analysis, and 1-2 example sentences showing your actual writing style.

The Groq LLM then generates suggestions that are contextually aware, stylistically consistent, and narratively coherent. Finally, `_clean_suggestion()` strips LLM artifacts like "Here's the continuation:" to deliver clean, ready-to-use text.

This entire pipeline—from cursor position to generated suggestion—completes in under 500 milliseconds thanks to our Redis caching layer and ChromaDB's optimized vector search.

---

## Part 2: Why 3-Tier Architecture (45 seconds)

We chose **3-tier architecture** over MVC and client-server for three critical reasons:

**First, scalability**: Our presentation layer (Next.js), business logic layer (FastAPI services), and data layer (MongoDB + ChromaDB) can scale independently. When embedding generation gets heavy, we scale only the business tier without touching the frontend.

**Second, separation of concerns**: Our AI services—like `copilot_service`, `rag_context_service`, and `embedding_service`—live in the business layer. This is superior to MVC where business logic often bleeds into controllers. With 3-tier, our `copilot_service` can orchestrate multiple data sources without knowing about HTTP requests.

**Third, technology flexibility**: Unlike traditional client-server which tightly couples frontend and backend, 3-tier lets us use different tech stacks per layer. We run ChromaDB vector operations and Redis caching in the data tier, heavy NLP processing in the business tier, and React streaming in the presentation tier—each optimized independently.

---

## Part 3: NFR Implementation Strategies (30 seconds)

Let me outline how we'll implement each non-functional requirement:

**Performance**: We use Redis caching for embeddings with LRU eviction, batch processing for vector operations, and ChromaDB's persistent storage eliminates re-computation. Our async architecture with FastAPI ensures embedding generation doesn't block user requests.

**Usability**: The frontend uses Zustand for state management enabling instant navigation between projects, characters, and scenes without page reloads. Entity relationships are pre-computed and cached.

**Reliability**: We implement graceful degradation—if ChromaDB fails, we fall back to PostgreSQL full-text search. Background task retries with exponential backoff ensure indexing jobs recover from transient failures.

**Maintainability**: Our service-oriented architecture means new AI agents integrate as separate services. The `RAGContextService` interface abstracts context assembly, so switching LLM providers requires changing only one service.

**Scalability**: ChromaDB handles millions of vectors locally, MongoDB sharding supports unlimited projects, and our stateless FastAPI services scale horizontally behind load balancers.

**Security**: JWT authentication with HTTP-only cookies prevents XSS attacks. Role-based access control in our `auth_service` restricts editing to project owners. All file uploads pass through virus scanning and type validation before storage.

---

## Conclusion (15 seconds)
In summary, CoWriteAI leverages semantic understanding through vector embeddings, maintains consistency through multi-layered context awareness, and scales efficiently with a modern 3-tier architecture. Our NFR implementations ensure the system performs reliably from alpha through production. Thank you—questions?
