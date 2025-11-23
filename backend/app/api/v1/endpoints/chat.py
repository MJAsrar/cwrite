"""
Chat API Endpoints

Handles AI chat interactions with RAG context
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import logging
from bson import ObjectId

from ....services.ai_chat_service import AIChatService
from ....repositories.conversation_repository import ConversationRepository
from ....models.conversation import (
    ChatRequest, ChatResponse, ConversationResponse,
    MessageResponse, ConversationCreate
)
from ....core.dependencies import get_current_user
from ....models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Send a message and get AI response with RAG context
    
    - Creates new conversation if conversation_id is None
    - Assembles relevant context (chunks, entities, scenes)
    - Generates response using Groq LLM
    - Can generate edit proposals if context provided
    - Stores conversation history
    """
    chat_service = AIChatService()
    
    try:
        # Check if this is an edit request
        edit_proposals = []
        has_edits = False
        
        if request.allow_edits and request.context:
            from ....services.edit_proposal_service import EditProposalService
            edit_service = EditProposalService()
            
            # Check if message is requesting an edit
            if edit_service.should_generate_edit(request.message, has_context=True):
                logger.info("Detected edit request, generating proposal...")
                
                proposal = await edit_service.generate_edit_proposal(
                    message=request.message,
                    file_name=request.context.get('file_name', 'Unknown'),
                    file_id=request.context.get('file_id') or request.file_id or '',
                    start_line=request.context.get('start_line', 1),
                    end_line=request.context.get('end_line', 1),
                    selected_text=request.context.get('selected_text', '')
                )
                
                if proposal:
                    edit_proposals.append(proposal.dict())
                    has_edits = True
                    logger.info(f"Generated edit proposal for {proposal.file_name}")
        
        # Get regular chat response
        response = await chat_service.chat(request, user_id=current_user.id)
        
        # Add edit proposals to response
        response_dict = response.dict() if hasattr(response, 'dict') else response
        response_dict['edit_proposals'] = edit_proposals
        response_dict['has_edits'] = has_edits
        
        return response_dict
    
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        import traceback
        logger.error(f"Chat error: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@router.get("/conversations", response_model=List[dict])
async def list_conversations(
    project_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    List user's conversations
    
    Optionally filter by project_id
    """
    chat_service = AIChatService()
    
    try:
        conversations = await chat_service.list_conversations(
            user_id=current_user.id,
            project_id=project_id
        )
        return conversations
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing conversations: {str(e)}")


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get conversation details"""
    if not ObjectId.is_valid(conversation_id):
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
    
    conversation_repo = ConversationRepository()
    conversation = await conversation_repo.get_by_id(conversation_id)
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Verify user owns this conversation
    if conversation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return ConversationResponse(**conversation.dict())


@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_conversation_messages(
    conversation_id: str,
    limit: Optional[int] = 100,
    current_user: User = Depends(get_current_user)
):
    """
    Get conversation message history
    
    Returns messages in chronological order
    """
    if not ObjectId.is_valid(conversation_id):
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
    
    # Verify conversation exists and user owns it
    conversation_repo = ConversationRepository()
    conversation = await conversation_repo.get_by_id(conversation_id)
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if conversation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get messages
    chat_service = AIChatService()
    messages = await chat_service.get_conversation_history(conversation_id, limit=limit)
    
    return messages


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a conversation and all its messages"""
    if not ObjectId.is_valid(conversation_id):
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
    
    # Verify conversation exists and user owns it
    conversation_repo = ConversationRepository()
    conversation = await conversation_repo.get_by_id(conversation_id)
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if conversation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Delete
    chat_service = AIChatService()
    success = await chat_service.delete_conversation(conversation_id)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete conversation")
    
    return {"message": "Conversation deleted successfully"}


@router.post("/conversations", response_model=ConversationResponse)
async def create_conversation(
    request: ConversationCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new conversation"""
    if not ObjectId.is_valid(request.project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    
    if request.file_id and not ObjectId.is_valid(request.file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID")
    
    chat_service = AIChatService()
    conversation = await chat_service._create_conversation(
        user_id=current_user.id,
        project_id=request.project_id,
        file_id=request.file_id
    )
    
    return ConversationResponse(**conversation.dict())


@router.get("/projects/{project_id}/conversations", response_model=List[dict])
async def get_project_conversations(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get all conversations for a project"""
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    
    conversation_repo = ConversationRepository()
    conversations = await conversation_repo.get_by_project(project_id)
    
    # Filter to only user's conversations
    user_conversations = [c for c in conversations if c.user_id == current_user.id]
    
    return [
        {
            'id': conv.id,
            'title': conv.title or "Untitled Conversation",
            'message_count': conv.message_count,
            'created_at': conv.created_at,
            'last_message_at': conv.last_message_at
        }
        for conv in user_conversations
    ]


@router.patch("/conversations/{conversation_id}/title")
async def update_conversation_title(
    conversation_id: str,
    title: str,
    current_user: User = Depends(get_current_user)
):
    """Update conversation title"""
    if not ObjectId.is_valid(conversation_id):
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
    
    # Verify conversation exists and user owns it
    conversation_repo = ConversationRepository()
    conversation = await conversation_repo.get_by_id(conversation_id)
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if conversation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update title
    success = await conversation_repo.update_title(conversation_id, title)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update title")
    
    return {"message": "Title updated successfully"}


@router.get("/projects/{project_id}/context-check")
async def check_project_context(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """Check if project has indexed content for RAG"""
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    
    from ....services.rag_context_service import RAGContextService
    
    rag_service = RAGContextService()
    overview = await rag_service.get_project_overview(project_id)
    
    return {
        "has_content": overview.get('total_entities', 0) > 0 or overview.get('total_chunks', 0) > 0,
        "overview": overview
    }

