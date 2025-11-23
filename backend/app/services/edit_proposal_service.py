"""
Edit Proposal Service

Generates and manages AI-proposed edits to files
"""

import logging
import re
import json
from typing import Dict, List, Optional, Any
from datetime import datetime

from .groq_service import GroqService
from ..models.edit_proposal import EditProposal, EditStatus

logger = logging.getLogger(__name__)


class EditProposalService:
    """Service for generating AI edit proposals"""
    
    EDIT_DETECTION_KEYWORDS = [
        'rewrite', 'change', 'modify', 'edit', 'fix', 'improve', 
        'make it', 'make this', 'update', 'revise', 'rephrase',
        'more', 'less', 'better', 'different'
    ]
    
    def __init__(self, groq_service: Optional[GroqService] = None):
        """Initialize edit proposal service"""
        self.groq = groq_service or GroqService()
    
    def should_generate_edit(self, message: str, has_context: bool) -> bool:
        """
        Determine if message is requesting an edit
        
        Args:
            message: User message
            has_context: Whether file context is provided
            
        Returns:
            True if edit should be generated
        """
        if not has_context:
            return False
        
        message_lower = message.lower()
        
        # Check for edit keywords
        for keyword in self.EDIT_DETECTION_KEYWORDS:
            if keyword in message_lower:
                return True
        
        # Check for imperative sentences (commands)
        if message.strip().endswith(('!', '.')):
            first_word = message.split()[0].lower() if message.split() else ''
            if first_word in ['make', 'change', 'fix', 'improve', 'rewrite']:
                return True
        
        return False
    
    async def generate_edit_proposal(
        self,
        message: str,
        file_name: str,
        file_id: str,
        start_line: int,
        end_line: int,
        selected_text: str,
        project_context: Optional[Dict[str, Any]] = None
    ) -> Optional[EditProposal]:
        """
        Generate an edit proposal based on user request
        
        Args:
            message: User's edit request
            file_name: Name of file to edit
            file_id: ID of file
            start_line: Starting line number
            end_line: Ending line number
            selected_text: Text to be edited
            project_context: Optional project context
            
        Returns:
            EditProposal or None if generation fails
        """
        try:
            logger.info(f"Generating edit proposal for {file_name}:{start_line}-{end_line}")
            
            # Build prompt for edit generation
            prompt = self._build_edit_prompt(
                message=message,
                file_name=file_name,
                selected_text=selected_text,
                start_line=start_line,
                end_line=end_line,
                project_context=project_context
            )
            
            # Generate edit using Groq
            response = await self.groq.generate_response(
                prompt=prompt,
                temperature=0.7,
                max_tokens=500
            )
            
            # Parse response to extract edit
            edit_data = self._parse_edit_response(response, selected_text)
            
            if not edit_data:
                logger.warning("Failed to parse edit response")
                return None
            
            # Create edit proposal
            proposal = EditProposal(
                id=f"edit_{datetime.utcnow().timestamp()}",
                file_id=file_id,
                file_name=file_name,
                start_line=start_line,
                end_line=end_line,
                original_text=selected_text,
                proposed_text=edit_data['proposed_text'],
                reasoning=edit_data['reasoning'],
                confidence=edit_data.get('confidence', 0.8),
                status=EditStatus.PENDING,
                created_at=datetime.utcnow()
            )
            
            logger.info(f"Generated edit proposal: {len(edit_data['proposed_text'])} chars")
            return proposal
            
        except Exception as e:
            logger.error(f"Error generating edit proposal: {e}")
            return None
    
    def _build_edit_prompt(
        self,
        message: str,
        file_name: str,
        selected_text: str,
        start_line: int,
        end_line: int,
        project_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Build prompt for edit generation"""
        
        prompt = f"""You are an AI writing assistant helping an author edit their manuscript.

File: {file_name}
Lines: {start_line}-{end_line}

Current text:
```
{selected_text}
```

User request: "{message}"

Task: Provide a specific edit to improve this text based on the user's request.

IMPORTANT:
- Maintain the author's voice and style
- Keep the same general meaning unless asked to change it
- Preserve character names and story facts
- Only edit what was requested

Respond in this EXACT JSON format:
{{
  "proposed_text": "The edited version of the text",
  "reasoning": "Brief explanation of what you changed and why",
  "confidence": 0.9
}}

JSON Response:"""
        
        return prompt
    
    def _parse_edit_response(self, response: str, original_text: str) -> Optional[Dict[str, Any]]:
        """
        Parse LLM response to extract edit data
        
        Args:
            response: LLM response
            original_text: Original text for fallback
            
        Returns:
            Dict with proposed_text, reasoning, confidence
        """
        try:
            # Try to extract JSON from response
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                json_str = json_match.group()
                data = json.loads(json_str)
                
                # Validate required fields
                if 'proposed_text' in data and 'reasoning' in data:
                    return {
                        'proposed_text': data['proposed_text'].strip(),
                        'reasoning': data['reasoning'].strip(),
                        'confidence': float(data.get('confidence', 0.8))
                    }
            
            # Fallback: Try to extract text between markers
            if '```' in response:
                parts = response.split('```')
                if len(parts) >= 2:
                    proposed_text = parts[1].strip()
                    # Remove language identifier if present
                    if '\n' in proposed_text:
                        lines = proposed_text.split('\n')
                        if lines[0].strip() in ['', 'text', 'markdown']:
                            proposed_text = '\n'.join(lines[1:])
                    
                    return {
                        'proposed_text': proposed_text,
                        'reasoning': 'Edit generated based on your request',
                        'confidence': 0.7
                    }
            
            # Last resort: Use the entire response as proposed text
            if len(response.strip()) > 0 and response.strip() != original_text:
                return {
                    'proposed_text': response.strip(),
                    'reasoning': 'Edit generated based on your request',
                    'confidence': 0.6
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error parsing edit response: {e}")
            return None
    
    def generate_diff(self, original: str, proposed: str) -> List[Dict[str, Any]]:
        """
        Generate a simple diff between original and proposed text
        
        Args:
            original: Original text
            proposed: Proposed text
            
        Returns:
            List of diff chunks
        """
        original_lines = original.split('\n')
        proposed_lines = proposed.split('\n')
        
        diff = []
        
        # Simple line-by-line diff
        max_lines = max(len(original_lines), len(proposed_lines))
        
        for i in range(max_lines):
            orig_line = original_lines[i] if i < len(original_lines) else None
            prop_line = proposed_lines[i] if i < len(proposed_lines) else None
            
            if orig_line == prop_line:
                diff.append({
                    'type': 'unchanged',
                    'content': orig_line,
                    'line_number': i + 1
                })
            elif orig_line and not prop_line:
                diff.append({
                    'type': 'removed',
                    'content': orig_line,
                    'line_number': i + 1
                })
            elif prop_line and not orig_line:
                diff.append({
                    'type': 'added',
                    'content': prop_line,
                    'line_number': i + 1
                })
            else:
                diff.append({
                    'type': 'removed',
                    'content': orig_line,
                    'line_number': i + 1
                })
                diff.append({
                    'type': 'added',
                    'content': prop_line,
                    'line_number': i + 1
                })
        
        return diff
