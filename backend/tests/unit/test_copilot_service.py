"""
Unit tests for CopilotService
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch


class TestCopilotService:
    """Unit tests for copilot service"""
    
    @pytest.mark.asyncio
    async def test_generate_suggestion_success(self):
        """Test successful suggestion generation"""
        from app.services.copilot_service import CopilotService
        
        # Mock dependencies
        mock_groq = Mock()
        mock_groq.generate_response = AsyncMock(return_value="The character walked slowly.")
        
        mock_rag = Mock()
        
        service = CopilotService(groq_service=mock_groq, rag_service=mock_rag)
        service._gather_story_context = AsyncMock(return_value={
            "characters": [{"name": "Alice", "aliases": [], "attributes": {}}],
            "location": "Forest",
            "themes": ["Adventure"]
        })
        
        result = await service.generate_suggestion(
            project_id="proj123",
            text_before="Alice entered the forest. ",
            text_after="",
            cursor_position=25,
            suggestion_type="continue"
        )
        
        assert "suggestion" in result
        assert "context_used" in result
        assert len(result["suggestion"]) > 0
        assert "Alice" in result["context_used"]["characters"][0]["name"]
    
    @pytest.mark.asyncio
    async def test_gather_story_context(self):
        """Test story context gathering"""
        from app.services.copilot_service import CopilotService
        
        service = CopilotService()
        
        # Mock entity repository using the same shape CopilotService expects
        project_id = "proj123"
        mock_entity = Mock()
        mock_entity.name = "Alice"
        mock_entity.type = "CHARACTER"
        mock_entity.aliases = ["Al"]
        mock_entity.attributes = {"role": "protagonist"}
        
        service.entity_repo.get_by_project = AsyncMock(return_value=[mock_entity])
        
        context = await service._gather_story_context(
            project_id=project_id,
            text_sample="Alice walked through the forest."
        )
        
        assert "characters" in context
        assert len(context["characters"]) > 0
        assert context["characters"][0]["name"] == "Alice"
    
    def test_analyze_writing_style(self):
        """Test writing style analysis"""
        from app.services.copilot_service import CopilotService
        
        service = CopilotService()
        
        # Test first person past tense with more past tense indicators
        text = "I walked through the forest. I was scared. I had been there before. I went slowly."
        style = service._analyze_writing_style(text)
        
        assert style["pov"] == "first_person"
        assert style["tense"] == "past"
        assert "avg_sentence_length" in style
    
    def test_analyze_writing_style_third_person(self):
        """Test third person detection"""
        from app.services.copilot_service import CopilotService
        
        service = CopilotService()
        
        text = "She walked through the forest. The trees were tall."
        style = service._analyze_writing_style(text)
        
        assert style["pov"] == "third_person"
    
    def test_clean_suggestion(self):
        """Test suggestion cleaning"""
        from app.services.copilot_service import CopilotService
        
        service = CopilotService()
        
        # Test removing artifacts
        dirty = "Here's the continuation: The sun was setting."
        clean = service._clean_suggestion(dirty)
        assert clean == "The sun was setting."
        
        # Test removing quotes
        quoted = '"The sun was setting."'
        clean = service._clean_suggestion(quoted)
        assert clean == "The sun was setting."
        
        # Test removing ellipsis
        ellipsis = "...and then she left."
        clean = service._clean_suggestion(ellipsis)
        assert clean == "and then she left."
    
    @pytest.mark.asyncio
    async def test_build_prompt_continue(self):
        """Test prompt building for continue suggestion"""
        from app.services.copilot_service import CopilotService
        
        service = CopilotService()
        
        story_context = {
            "characters": [{"name": "Alice", "attributes": {"role": "protagonist"}}],
            "location": "Forest",
            "themes": ["Adventure"],
            "style_characteristics": {
                "pov": "third_person",
                "tense": "past",
                "formality": "informal",
                "avg_sentence_length": 15
            }
        }
        
        prompt = await service._build_prompt(
            suggestion_type="continue",
            text_before="Alice walked through the forest.",
            text_after="",
            story_context=story_context
        )
        
        assert "Alice" in prompt
        assert "Forest" in prompt
        assert "continue" in prompt.lower()
        assert "third person" in prompt.lower()

    @pytest.mark.asyncio
    async def test_build_prompt_includes_dialogue_tone_and_character_profile_details(self):
        """Test prompt includes inferred tone and character profile attributes for dialogue generation."""
        from app.services.copilot_service import CopilotService

        service = CopilotService()

        story_context = {
            "characters": [{
                "name": "Mara",
                "attributes": {
                    "role": "protagonist",
                    "temperament": "witty",
                    "speech_pattern": "short, sharp lines"
                }
            }],
            "location": "Tavern",
            "themes": ["Trust", "Betrayal"],
            "style_characteristics": {
                "pov": "third_person",
                "tense": "past",
                "formality": "informal",
                "avg_sentence_length": 10
            }
        }

        prompt = await service._build_prompt(
            suggestion_type="continue",
            text_before='Mara leaned in. "Tell me the truth," she said.',
            text_after="",
            story_context=story_context
        )

        assert "Characters present: Mara" in prompt
        assert "witty" in prompt
        assert "short, sharp lines" in prompt
        assert "Tone: informal" in prompt
        assert "Maintain character consistency and voice" in prompt

    def test_analyze_writing_style_detects_informal_tone_from_contractions(self):
        """Test style analysis marks dialogue-heavy contraction usage as informal tone."""
        from app.services.copilot_service import CopilotService

        service = CopilotService()
        text = "\"I can't stay,\" she said. \"We're done, and I won't explain.\""

        style = service._analyze_writing_style(text)

        assert style["formality"] == "informal"
        assert "tense" in style
        assert "pov" in style

    @pytest.mark.asyncio
    async def test_gather_story_context_keeps_only_mentioned_characters_for_dialogue(self):
        """Test context gathering only includes characters mentioned in current dialogue context."""
        from app.services.copilot_service import CopilotService

        service = CopilotService()

        project_id = "proj123"
        mara = Mock()
        mara.name = "Mara"
        mara.type = "CHARACTER"
        mara.aliases = ["M"]
        mara.attributes = {"role": "protagonist", "temperament": "witty"}

        jon = Mock()
        jon.name = "Jon"
        jon.type = "CHARACTER"
        jon.aliases = []
        jon.attributes = {"role": "antagonist"}

        service.entity_repo.get_by_project = AsyncMock(return_value=[mara, jon])

        context = await service._gather_story_context(
            project_id=project_id,
            text_sample='Mara whispered, "Keep your voice down."'
        )

        names = [c["name"] for c in context.get("characters", [])]
        assert "Mara" in names
        assert "Jon" not in names
        assert context["characters"][0]["attributes"]["temperament"] == "witty"
    
    @pytest.mark.asyncio
    async def test_generate_suggestion_error_handling(self):
        """Test error handling in suggestion generation"""
        from app.services.copilot_service import CopilotService
        
        mock_groq = Mock()
        mock_groq.generate_response = AsyncMock(side_effect=Exception("API Error"))
        
        service = CopilotService(groq_service=mock_groq)
        service._gather_story_context = AsyncMock(return_value={})
        
        with pytest.raises(Exception):
            await service.generate_suggestion(
                project_id="proj123",
                text_before="Test",
                text_after="",
                cursor_position=4
            )
    
    def test_extract_last_sentence(self):
        """Test extracting last sentence"""
        from app.services.copilot_service import CopilotService
        
        service = CopilotService()
        
        text = "First sentence. Second sentence. Third"
        last = service._extract_last_sentence(text)
        
        assert "Third" in last
        assert "First" not in last
