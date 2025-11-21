# RAG + Groq LLM Setup Guide

## Overview
The AI Chat feature uses **RAG (Retrieval Augmented Generation)** with **Groq LLM** to provide intelligent, context-aware responses about your story.

## Features
- ✅ Semantic search across your story content
- ✅ Access to characters, locations, and themes
- ✅ Scene analysis (POV, timeline, emotional tone)
- ✅ Character relationships
- ✅ Multi-turn conversations with memory
- ✅ Fast responses using Groq's infrastructure

## Setup

### 1. Get Groq API Key

1. Go to [https://console.groq.com](https://console.groq.com)
2. Sign up or log in
3. Navigate to API Keys
4. Create a new API key
5. Copy the key (starts with `gsk_...`)

### 2. Configure Environment Variable

Add to your `backend/.env`:

```bash
GROQ_API_KEY=gsk_your_actual_api_key_here
```

### 3. Restart Backend

```bash
cd backend
python -m uvicorn app.main:app --reload
```

## Available Models

- **llama-3.3-70b-versatile** (Default): Best for creative writing, 128K context
- **llama-3.1-70b-versatile**: Good balance, 128K context
- **mixtral-8x7b-32768**: Fast, 32K context
- **gemma2-9b-it**: Lightweight, 8K context

## How It Works

1. **User asks a question** → "Who is Laura?"
2. **RAG Context Assembly**:
   - Semantic search finds relevant text chunks
   - Entities mentioned are retrieved (Laura's details, aliases)
   - Related scenes are identified (where Laura appears)
   - Character relationships are included
3. **Context formatted for LLM**:
   - Story excerpts
   - Character profiles
   - Scene metadata (POV, tone, etc.)
4. **Groq LLM generates response** based on context
5. **Response stored** in conversation history

## API Endpoints

### Chat
```bash
POST /api/v1/chat/chat
{
  "message": "Who is Laura?",
  "project_id": "...",
  "file_id": "..." (optional),
  "conversation_id": null (creates new conversation)
}
```

### List Conversations
```bash
GET /api/v1/chat/conversations?project_id=...
```

### Get Conversation History
```bash
GET /api/v1/chat/conversations/{conversation_id}/messages
```

### Delete Conversation
```bash
DELETE /api/v1/chat/conversations/{conversation_id}
```

## Usage in Frontend

The AI Chat Panel is integrated into the workspace sidebar. Click the AI icon (✨) to open it.

Example questions:
- "Who are the main characters?"
- "Summarize chapter 3"
- "What's Laura's relationship with Peter?"
- "Which scenes are set in Somerset?"
- "What's the POV of scene 2?"
- "Show me all flashback scenes"

## Customization

### Adjust Temperature
Lower = More focused, Higher = More creative

In `ai_chat_service.py`:
```python
temperature=0.7  # Default (0.0-2.0)
```

### Change Model
Edit `conversation.model` or pass in ChatRequest

### Adjust Context Size
In ChatRequest:
```python
max_context_chunks=5  # Number of text chunks to retrieve
```

## Troubleshooting

### Error: "GROQ_API_KEY not configured"
- Make sure the environment variable is set in `backend/.env`
- Restart the backend after adding the key

### Error: "Rate limit exceeded"
- Groq free tier has rate limits
- Wait a moment and try again
- Consider upgrading your Groq plan

### Slow responses
- Groq is very fast (usually <1s)
- If slow, check your internet connection
- Try a lighter model like `gemma2-9b-it`

### Empty or irrelevant responses
- Make sure your file is indexed
- Check that entities and scenes are detected
- Try re-uploading the file

## Cost

Groq offers a generous **free tier**:
- Fast inference (tokens/second)
- No per-request charges on free tier
- Check [Groq pricing](https://groq.com/pricing) for details

## Privacy

- Your conversations are stored in your MongoDB
- Groq processes requests but doesn't store conversation history
- Your story content is only sent in relevant excerpts (not the entire text)


