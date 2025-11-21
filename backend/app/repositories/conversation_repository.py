"""
Conversation Repository

Handles CRUD operations for conversations
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId

from app.core.repository import BaseRepository
from ..models.conversation import Conversation


class ConversationRepository(BaseRepository[Conversation]):
    """Repository for conversation management"""
    
    def __init__(self):
        super().__init__("conversations")
    
    def _to_model(self, document: Dict[str, Any]) -> Conversation:
        """Convert MongoDB document to Conversation model"""
        return Conversation(**document)
    
    def _to_document(self, model: Conversation) -> Dict[str, Any]:
        """Convert Conversation model to MongoDB document"""
        return model.dict(by_alias=True, exclude_none=True)
    
    async def get_by_project(self, project_id: str) -> List[Conversation]:
        """Get all conversations for a project"""
        if not ObjectId.is_valid(project_id):
            return []
        
        cursor = self.collection.find(
            {"project_id": project_id}
        ).sort("last_message_at", -1)
        
        conversations = []
        async for doc in cursor:
            conversations.append(Conversation(**doc))
        
        return conversations
    
    async def get_by_user(self, user_id: str, project_id: Optional[str] = None) -> List[Conversation]:
        """Get all conversations for a user, optionally filtered by project"""
        if not ObjectId.is_valid(user_id):
            return []
        
        query = {"user_id": user_id}
        if project_id and ObjectId.is_valid(project_id):
            query["project_id"] = project_id
        
        cursor = self.collection.find(query).sort("last_message_at", -1)
        
        conversations = []
        async for doc in cursor:
            conversations.append(Conversation(**doc))
        
        return conversations
    
    async def get_by_file(self, file_id: str) -> List[Conversation]:
        """Get all conversations about a specific file"""
        if not ObjectId.is_valid(file_id):
            return []
        
        cursor = self.collection.find(
            {"file_id": file_id}
        ).sort("last_message_at", -1)
        
        conversations = []
        async for doc in cursor:
            conversations.append(Conversation(**doc))
        
        return conversations
    
    async def increment_message_count(self, conversation_id: str) -> bool:
        """Increment message count and update last_message_at"""
        if not ObjectId.is_valid(conversation_id):
            return False
        
        result = await self.collection.update_one(
            {"_id": ObjectId(conversation_id)},
            {
                "$inc": {"message_count": 1},
                "$set": {
                    "last_message_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return result.modified_count > 0
    
    async def update_title(self, conversation_id: str, title: str) -> bool:
        """Update conversation title"""
        if not ObjectId.is_valid(conversation_id):
            return False
        
        result = await self.collection.update_one(
            {"_id": ObjectId(conversation_id)},
            {
                "$set": {
                    "title": title,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return result.modified_count > 0
    
    async def update_summary(self, conversation_id: str, summary: str) -> bool:
        """Update conversation summary"""
        if not ObjectId.is_valid(conversation_id):
            return False
        
        result = await self.collection.update_one(
            {"_id": ObjectId(conversation_id)},
            {
                "$set": {
                    "summary": summary,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return result.modified_count > 0

