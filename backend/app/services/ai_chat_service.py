"""
AI Chat Service

Orchestrates AI conversations with RAG context:
- Manages conversation flow
- Assembles context via RAG
- Routes to genre-specific HuggingFace models or Groq LLM
- Stores conversation history
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

from .groq_service import GroqService
from .huggingface_service import HuggingFaceService, GENRE_SYSTEM_PROMPTS
from .rag_context_service import RAGContextService
from ..repositories.conversation_repository import ConversationRepository
from ..repositories.message_repository import MessageRepository
from ..repositories.project_repository import ProjectRepository
from ..models.conversation import (
    Conversation, Message, MessageRole,
    ConversationCreate, ChatRequest, ChatResponse, MessageResponse
)

logger = logging.getLogger(__name__)


class AIChatService:
    """Service for AI-powered chat with story context"""
    
    SYSTEM_PROMPT = """You are an intelligent writing assistant helping authors understand and analyze their stories.

You have access to:
- The full story text (in relevant excerpts)
- All characters, locations, and themes
- Scene analysis (POV, timeline, emotional tone, etc.)
- Character relationships
- Narrative structure

Your role:
- Answer questions about the story with specific, accurate information from the context provided
- Provide insights about characters, plot, themes, and structure
- Help identify patterns, inconsistencies, or opportunities for improvement
- Cite specific scenes or excerpts when relevant
- Be conversational but precise
- If you're uncertain about something, say so rather than guessing

Always base your answers on the context provided. Be helpful, insightful, and supportive of the author's creative process."""
    
    def __init__(
        self,
        groq_service: Optional[GroqService] = None,
        hf_service: Optional[HuggingFaceService] = None,
        rag_service: Optional[RAGContextService] = None,
        conversation_repo: Optional[ConversationRepository] = None,
        message_repo: Optional[MessageRepository] = None,
        project_repo: Optional[ProjectRepository] = None
    ):
        """Initialize AI chat service"""
        self.groq = groq_service or GroqService()
        self.hf = hf_service or HuggingFaceService()
        self.rag = rag_service or RAGContextService()
        self.conversation_repo = conversation_repo or ConversationRepository()
        self.message_repo = message_repo or MessageRepository()
        self.project_repo = project_repo or ProjectRepository()
    
    async def chat(
        self,
        request: ChatRequest,
        user_id: str
    ) -> ChatResponse:
        """
        Process a chat message and generate a response
        
        Args:
            request: Chat request with message and context preferences
            user_id: User ID
            
        Returns:
            Chat response with AI-generated message
        """
        try:
            # 1. Get or create conversation
            if request.conversation_id:
                conversation = await self.conversation_repo.get_by_id(request.conversation_id)
                if not conversation:
                    raise ValueError(f"Conversation {request.conversation_id} not found")
            else:
                # Create new conversation
                conversation = await self._create_conversation(
                    user_id=user_id,
                    project_id=request.project_id,
                    file_id=request.file_id
                )
            
            # 2. Store user message
            user_message = await self._store_message(
                conversation_id=conversation.id,
                role=MessageRole.USER,
                content=request.message
            )
            
            # 3. Look up the project genre for model routing
            genre = "general"
            model_used = "llama-3.3-70b-versatile"
            try:
                project = await self.project_repo.get_by_id(request.project_id)
                if project and project.settings and project.settings.genre:
                    genre = project.settings.genre.value if hasattr(project.settings.genre, 'value') else str(project.settings.genre)
            except Exception as e:
                logger.warning(f"Could not fetch project genre: {e}, defaulting to general")
            
            # 4. Assemble RAG context
            context = await self.rag.assemble_context(
                query=request.message,
                project_id=request.project_id,
                file_id=request.file_id,
                max_chunks=request.max_context_chunks,
                include_entities=request.include_entities,
                include_scenes=request.include_scenes,
                include_relationships=request.include_relationships
            )
            
            # 5. Format context for LLM
            formatted_context = self.rag.format_context_for_llm(context)
            
            # 6. Build conversation history
            recent_messages = await self.message_repo.get_latest_messages(
                conversation.id,
                count=10
            )
            
            # 7. Use genre-specific system prompt
            system_prompt = GENRE_SYSTEM_PROMPTS.get(genre, self.SYSTEM_PROMPT)
            
            # 8. Prepare messages for LLM
            llm_messages = [{"role": "system", "content": system_prompt}]
            
            for msg in recent_messages[:-1]:
                llm_messages.append({
                    "role": msg.role.value,
                    "content": msg.content
                })
            
            user_prompt = f"""{formatted_context}

User Question: {request.message}

Please provide a helpful, specific answer based on the context above."""
            
            llm_messages.append({
                "role": "user",
                "content": user_prompt
            })
            
            # 9. Try HuggingFace genre-specific model first, fall back to Groq
            assistant_content = None
            
            if genre != "general" and self.hf.api_token:
                try:
                    logger.info(f"Using HuggingFace model for genre '{genre}'")
                    hf_response = await self.hf.chat_completion(
                        messages=llm_messages,
                        genre=genre,
                        temperature=conversation.temperature,
                        max_tokens=2000
                    )
                    assistant_content = hf_response["choices"][0]["message"]["content"]
                    model_used = self.hf.get_model_for_genre(genre)
                    logger.info(f"HuggingFace response received from {model_used}")
                except Exception as e:
                    logger.warning(f"HuggingFace failed for genre '{genre}': {e}, falling back to Groq")
                    assistant_content = None
            
            # Fallback to Groq
            if assistant_content is None:
                assistant_content = await self.groq.continue_conversation(
                    messages=llm_messages,
                    temperature=conversation.temperature
                )
                model_used = "llama-3.3-70b-versatile"
            
            # 10. Store assistant message
            assistant_message = await self._store_message(
                conversation_id=conversation.id,
                role=MessageRole.ASSISTANT,
                content=assistant_content,
                context_used=context,
                model=model_used
            )
            
            # 11. Update conversation
            await self.conversation_repo.increment_message_count(conversation.id)
            
            # 12. Auto-generate title if this is the first exchange
            if conversation.message_count == 0:
                await self._generate_conversation_title(conversation.id, request.message)
            
            # 13. Build response
            return ChatResponse(
                conversation_id=conversation.id,
                message=MessageResponse(
                    id=assistant_message.id,
                    conversation_id=assistant_message.conversation_id,
                    role=assistant_message.role.value,
                    content=assistant_message.content,
                    context_used=None,
                    tokens=assistant_message.tokens,
                    model=assistant_message.model,
                    created_at=assistant_message.created_at
                ),
                context_summary={
                    'chunks_used': len(context.get('chunks', [])),
                    'entities_mentioned': len(context.get('entities', [])),
                    'scenes_referenced': len(context.get('scenes', [])),
                    'genre': genre,
                    'model_used': model_used
                }
            )
        
        except Exception as e:
            logger.error(f"Error in chat: {str(e)}")
            raise
    
    async def get_conversation_history(
        self,
        conversation_id: str,
        limit: Optional[int] = None
    ) -> List[MessageResponse]:
        """
        Get conversation history
        
        Args:
            conversation_id: Conversation ID
            limit: Optional limit on messages
            
        Returns:
            List of messages
        """
        messages = await self.message_repo.get_by_conversation(
            conversation_id, limit=limit
        )
        
        return [
            MessageResponse(
                id=msg.id,
                conversation_id=msg.conversation_id,
                role=msg.role.value,
                content=msg.content,
                context_used=None,  # Don't include full context
                tokens=msg.tokens,
                model=msg.model,
                created_at=msg.created_at
            )
            for msg in messages
        ]
    
    async def list_conversations(
        self,
        user_id: str,
        project_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        List user conversations
        
        Args:
            user_id: User ID
            project_id: Optional project filter
            
        Returns:
            List of conversations
        """
        conversations = await self.conversation_repo.get_by_user(user_id, project_id)
        
        return [
            {
                'id': conv.id,
                'project_id': conv.project_id,
                'file_id': conv.file_id,
                'title': conv.title or "Untitled Conversation",
                'message_count': conv.message_count,
                'created_at': conv.created_at,
                'last_message_at': conv.last_message_at
            }
            for conv in conversations
        ]
    
    async def delete_conversation(self, conversation_id: str) -> bool:
        """Delete a conversation and all its messages"""
        # Delete messages first
        await self.message_repo.delete_by_conversation(conversation_id)
        
        # Delete conversation
        return await self.conversation_repo.delete(conversation_id)
    
    async def _create_conversation(
        self,
        user_id: str,
        project_id: str,
        file_id: Optional[str] = None
    ) -> Conversation:
        """Create a new conversation"""
        conversation = Conversation(
            project_id=project_id,
            file_id=file_id,
            user_id=user_id,
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            message_count=0,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        return await self.conversation_repo.create(conversation)
    
    async def _store_message(
        self,
        conversation_id: str,
        role: MessageRole,
        content: str,
        context_used: Optional[Dict] = None,
        model: Optional[str] = None
    ) -> Message:
        """Store a message in the conversation"""
        # Estimate tokens
        tokens = len(content) // 4
        
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            context_used=context_used,
            tokens=tokens,
            model=model,
            created_at=datetime.utcnow()
        )
        
        return await self.message_repo.create(message)
    
    async def _generate_conversation_title(
        self,
        conversation_id: str,
        first_message: str
    ):
        """Auto-generate a conversation title from the first message"""
        try:
            # Simple heuristic: use first 50 chars of first message
            title = first_message[:50]
            if len(first_message) > 50:
                title += "..."
            
            await self.conversation_repo.update_title(conversation_id, title)
        
        except Exception as e:
            logger.warning(f"Failed to generate title: {str(e)}")

