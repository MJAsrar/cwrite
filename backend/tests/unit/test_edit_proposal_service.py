"""
Unit tests for EditProposalService
"""
import pytest
from unittest.mock import Mock, AsyncMock
import json


class TestEditProposalService:
    """Unit tests for edit proposal service"""
    
    def test_should_generate_edit_with_keywords(self):
        """Test edit detection with keywords"""
        from app.services.edit_proposal_service import EditProposalService
        
        service = EditProposalService()
        
        # Should detect edit requests
        assert service.should_generate_edit("Rewrite this paragraph", has_context=True)
        assert service.should_generate_edit("Make it more dramatic", has_context=True)
        assert service.should_generate_edit("Fix the grammar here", has_context=True)
        assert service.should_generate_edit("Change this to past tense", has_context=True)
        
        # Should not detect without context
        assert not service.should_generate_edit("Rewrite this", has_context=False)
        
        # Should not detect non-edit messages
        assert not service.should_generate_edit("What happens next?", has_context=True)
        assert not service.should_generate_edit("Tell me about Alice", has_context=True)
    
    def test_should_generate_edit_imperative(self):
        """Test edit detection with imperative sentences"""
        from app.services.edit_proposal_service import EditProposalService
        
        service = EditProposalService()
        
        assert service.should_generate_edit("Make this better!", has_context=True)
        assert service.should_generate_edit("Fix this sentence.", has_context=True)
        assert service.should_generate_edit("Improve the dialogue.", has_context=True)
    
    @pytest.mark.asyncio
    async def test_generate_edit_proposal_success(self):
        """Test successful edit proposal generation"""
        from app.services.edit_proposal_service import EditProposalService
        
        mock_groq = Mock()
        mock_response = json.dumps({
            "proposed_text": "The edited version of the text.",
            "reasoning": "Made it more concise and clear.",
            "confidence": 0.9
        })
        mock_groq.generate_response = AsyncMock(return_value=mock_response)
        
        service = EditProposalService(groq_service=mock_groq)
        
        proposal = await service.generate_edit_proposal(
            message="Make this more concise",
            file_name="chapter1.txt",
            file_id="file123",
            start_line=10,
            end_line=12,
            selected_text="This is the original text that needs editing."
        )
        
        assert proposal is not None
        assert proposal.file_id == "file123"
        assert proposal.file_name == "chapter1.txt"
        assert proposal.start_line == 10
        assert proposal.end_line == 12
        assert len(proposal.proposed_text) > 0
        assert len(proposal.reasoning) > 0
        assert proposal.confidence > 0
    
    @pytest.mark.asyncio
    async def test_generate_edit_proposal_parse_failure(self):
        """Test handling of unparseable response"""
        from app.services.edit_proposal_service import EditProposalService
        
        mock_groq = Mock()
        mock_groq.generate_response = AsyncMock(return_value="Invalid response")
        
        service = EditProposalService(groq_service=mock_groq)
        
        proposal = await service.generate_edit_proposal(
            message="Edit this",
            file_name="test.txt",
            file_id="file123",
            start_line=1,
            end_line=1,
            selected_text="Original text"
        )
        
        # Should return None or handle gracefully
        assert proposal is None or proposal.proposed_text != "Original text"
    
    def test_parse_edit_response_json(self):
        """Test parsing JSON response"""
        from app.services.edit_proposal_service import EditProposalService
        
        service = EditProposalService()
        
        response = json.dumps({
            "proposed_text": "Edited text",
            "reasoning": "Made improvements",
            "confidence": 0.85
        })
        
        result = service._parse_edit_response(response, "Original")
        
        assert result is not None
        assert result["proposed_text"] == "Edited text"
        assert result["reasoning"] == "Made improvements"
        assert result["confidence"] == 0.85
    
    def test_parse_edit_response_code_block(self):
        """Test parsing response with code blocks"""
        from app.services.edit_proposal_service import EditProposalService
        
        service = EditProposalService()
        
        response = "Here's the edit:\n```\nEdited text here\n```\nHope this helps!"
        
        result = service._parse_edit_response(response, "Original")
        
        assert result is not None
        assert "Edited text here" in result["proposed_text"]
    
    def test_parse_edit_response_fallback(self):
        """Test fallback parsing"""
        from app.services.edit_proposal_service import EditProposalService
        
        service = EditProposalService()
        
        response = "This is the edited version of the text."
        
        result = service._parse_edit_response(response, "Original text")
        
        assert result is not None
        assert result["proposed_text"] == response.strip()
    
    def test_generate_diff(self):
        """Test diff generation"""
        from app.services.edit_proposal_service import EditProposalService
        
        service = EditProposalService()
        
        original = "Line 1\nLine 2\nLine 3"
        proposed = "Line 1\nModified Line 2\nLine 3"
        
        diff = service.generate_diff(original, proposed)
        
        assert len(diff) > 0
        assert any(d['type'] == 'unchanged' for d in diff)
        assert any(d['type'] in ['removed', 'added'] for d in diff)
    
    def test_generate_diff_additions(self):
        """Test diff with additions"""
        from app.services.edit_proposal_service import EditProposalService
        
        service = EditProposalService()
        
        original = "Line 1\nLine 2"
        proposed = "Line 1\nLine 2\nLine 3"
        
        diff = service.generate_diff(original, proposed)
        
        added_lines = [d for d in diff if d['type'] == 'added']
        assert len(added_lines) > 0
        assert any('Line 3' in d['content'] for d in added_lines)
    
    def test_generate_diff_deletions(self):
        """Test diff with deletions"""
        from app.services.edit_proposal_service import EditProposalService
        
        service = EditProposalService()
        
        original = "Line 1\nLine 2\nLine 3"
        proposed = "Line 1\nLine 3"
        
        diff = service.generate_diff(original, proposed)
        
        removed_lines = [d for d in diff if d['type'] == 'removed']
        assert len(removed_lines) > 0
    
    def test_build_edit_prompt(self):
        """Test edit prompt building"""
        from app.services.edit_proposal_service import EditProposalService
        
        service = EditProposalService()
        
        prompt = service._build_edit_prompt(
            message="Make this more dramatic",
            file_name="chapter1.txt",
            selected_text="She walked into the room.",
            start_line=10,
            end_line=10
        )
        
        assert "chapter1.txt" in prompt
        assert "She walked into the room." in prompt
        assert "Make this more dramatic" in prompt
        assert "JSON" in prompt
    
    @pytest.mark.asyncio
    async def test_generate_edit_proposal_error_handling(self):
        """Test error handling in edit generation"""
        from app.services.edit_proposal_service import EditProposalService
        
        mock_groq = Mock()
        mock_groq.generate_response = AsyncMock(side_effect=Exception("API Error"))
        
        service = EditProposalService(groq_service=mock_groq)
        
        proposal = await service.generate_edit_proposal(
            message="Edit this",
            file_name="test.txt",
            file_id="file123",
            start_line=1,
            end_line=1,
            selected_text="Text"
        )
        
        # Should return None on error
        assert proposal is None
