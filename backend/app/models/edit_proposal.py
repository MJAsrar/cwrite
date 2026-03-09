"""
Edit Proposal Models

Models for AI-proposed edits to files
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class EditStatus(str, Enum):
    """Edit proposal status"""
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    APPLIED = "applied"


class EditProposal(BaseModel):
    """AI-proposed edit to a file"""
    id: Optional[str] = None
    file_id: str
    file_name: str
    start_line: int
    end_line: int
    original_text: str
    proposed_text: str
    reasoning: str
    confidence: float = 0.8
    status: EditStatus = EditStatus.PENDING
    created_at: Optional[datetime] = None
    
    class Config:
        use_enum_values = True


class EditProposalRequest(BaseModel):
    """Request to generate edit proposals"""
    message: str
    project_id: str
    file_id: Optional[str] = None
    context: Optional[dict] = None
    allow_edits: bool = True


class EditProposalResponse(BaseModel):
    """Response containing edit proposals"""
    message: str
    edit_proposals: List[EditProposal] = []
    has_edits: bool = False


class ApplyEditRequest(BaseModel):
    """Request to apply an edit"""
    edit_id: str
    file_id: str
    start_line: int
    end_line: int
    new_text: str
