"""
Message Repository

Handles CRUD operations for chat messages
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId

from app.core.repository import BaseRepository
from ..models.conversation import Message, MessageRole


class MessageRepository(BaseRepository[Message]):
    """Repository for message management"""
    
    def __init__(self):
        super().__init__("messages")
    
    def _to_model(self, document: Dict[str, Any]) -> Message:
        """Convert MongoDB document to Message model"""
        return Message(**document)
    
    def _to_document(self, model: Message) -> Dict[str, Any]:
        """Convert Message model to MongoDB document"""
        return model.dict(by_alias=True, exclude_none=True)
    
    async def get_by_conversation(
        self,
        conversation_id: str,
        limit: Optional[int] = None,
        offset: int = 0
    ) -> List[Message]:
        """
        Get messages for a conversation
        
        Args:
            conversation_id: Conversation ID
            limit: Maximum messages to return
            offset: Number of messages to skip
            
        Returns:
            List of messages ordered by creation time
        """
        if not ObjectId.is_valid(conversation_id):
            return []
        
        query = {"conversation_id": conversation_id}
        cursor = self.collection.find(query).sort("created_at", 1).skip(offset)
        
        if limit:
            cursor = cursor.limit(limit)
        
        messages = []
        async for doc in cursor:
            messages.append(Message(**doc))
        
        return messages
    
    async def get_latest_messages(
        self,
        conversation_id: str,
        count: int = 10
    ) -> List[Message]:
        """Get the latest N messages from a conversation"""
        if not ObjectId.is_valid(conversation_id):
            return []
        
        cursor = self.collection.find(
            {"conversation_id": conversation_id}
        ).sort("created_at", -1).limit(count)
        
        messages = []
        async for doc in cursor:
            messages.append(Message(**doc))
        
        # Reverse to get chronological order
        return list(reversed(messages))
    
    async def count_by_conversation(self, conversation_id: str) -> int:
        """Count total messages in a conversation"""
        if not ObjectId.is_valid(conversation_id):
            return 0
        
        return await self.collection.count_documents(
            {"conversation_id": conversation_id}
        )
    
    async def delete_by_conversation(self, conversation_id: str) -> int:
        """Delete all messages in a conversation"""
        if not ObjectId.is_valid(conversation_id):
            return 0
        
        result = await self.collection.delete_many(
            {"conversation_id": conversation_id}
        )
        
        return result.deleted_count

