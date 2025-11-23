"""
Copilot Service

Generates context-aware inline writing suggestions
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

from .groq_service import GroqService
from .rag_context_service import RAGContextService
from ..repositories.entity_repository import EntityRepository
from ..repositories.text_chunk_repository import TextChunkRepository

logger = logging.getLogger(__name__)


class CopilotService:
    """Service for generating inline writing suggestions"""
    
    def __init__(
        self,
        groq_service: Optional[GroqService] = None,
        rag_service: Optional[RAGContextService] = None
    ):
        """Initialize copilot service"""
        self.groq = groq_service or GroqService()
        self.rag = rag_service or RAGContextService()
        self.entity_repo = EntityRepository()
        self.chunk_repo = TextChunkRepository()
    
    async def generate_suggestion(
        self,
        project_id: str,
        text_before: str,
        text_after: str,
        cursor_position: int,
        suggestion_type: str = "continue",
        max_tokens: int = 100,
        file_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate context-aware writing suggestion
        
        Args:
            project_id: Project ID
            text_before: Text before cursor
            text_after: Text after cursor
            cursor_position: Cursor position in document
            suggestion_type: Type of suggestion (continue, complete, rewrite)
            max_tokens: Maximum tokens to generate
            file_id: Optional file ID
            user_id: Optional user ID
            
        Returns:
            Dict with suggestion and context info
        """
        try:
            logger.info(f"Starting copilot suggestion generation for project {project_id}")
            
            # 1. Extract immediate context (last 500 chars)
            immediate_context = text_before[-500:] if len(text_before) > 500 else text_before
            logger.info(f"Immediate context length: {len(immediate_context)}")
            
            # 2. Gather story context
            logger.info("Gathering story context...")
            story_context = await self._gather_story_context(
                project_id=project_id,
                text_sample=immediate_context
            )
            logger.info(f"Story context gathered: {len(story_context.get('characters', []))} characters")
            
            # 3. Build prompt based on suggestion type
            logger.info("Building prompt...")
            prompt = await self._build_prompt(
                suggestion_type=suggestion_type,
                text_before=immediate_context,
                text_after=text_after[:200],  # Next 200 chars if available
                story_context=story_context
            )
            logger.info(f"Prompt built: {len(prompt)} chars")
            
            # 4. Generate suggestion using fast model
            logger.info("Calling Groq API...")
            suggestion = await self.groq.generate_response(
                prompt=prompt,
                temperature=0.7,
                max_tokens=max_tokens
            )
            logger.info(f"Received suggestion: {len(suggestion)} chars")
            
            # 5. Clean up suggestion
            cleaned_suggestion = self._clean_suggestion(suggestion)
            logger.info(f"Cleaned suggestion: {len(cleaned_suggestion)} chars")
            
            return {
                "suggestion": cleaned_suggestion,
                "context_used": {
                    "characters": story_context.get("characters", []),
                    "location": story_context.get("location"),
                    "recent_events": story_context.get("recent_events")
                },
                "confidence": 0.8  # Placeholder
            }
            
        except Exception as e:
            import traceback
            logger.error(f"Error generating copilot suggestion: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise
    
    async def _gather_story_context(
        self,
        project_id: str,
        text_sample: str
    ) -> Dict[str, Any]:
        """
        Gather relevant story context for suggestion using RAG
        
        Args:
            project_id: Project ID
            text_sample: Recent text to analyze
            
        Returns:
            Dict with story context
        """
        try:
            context = {}
            
            # 1. Get all entities for the project
            entities = await self.entity_repo.get_by_project(project_id)
            
            # 2. Identify characters mentioned in recent text
            mentioned_characters = []
            mentioned_locations = []
            mentioned_themes = []
            
            for entity in entities:
                entity_name_lower = entity.name.lower()
                text_lower = text_sample.lower()
                
                if entity_name_lower in text_lower:
                    if entity.type == "CHARACTER":
                        mentioned_characters.append({
                            "name": entity.name,
                            "aliases": entity.aliases,
                            "attributes": entity.attributes or {}
                        })
                    elif entity.type == "LOCATION":
                        mentioned_locations.append({
                            "name": entity.name,
                            "attributes": entity.attributes or {}
                        })
                    elif entity.type == "THEME":
                        mentioned_themes.append({
                            "name": entity.name
                        })
            
            context["characters"] = mentioned_characters[:5]  # Top 5
            context["location"] = mentioned_locations[0]["name"] if mentioned_locations else None
            context["themes"] = [t["name"] for t in mentioned_themes[:3]]
            
            # 3. Use RAG to find similar text chunks for style matching
            try:
                # Get last sentence or two for semantic search
                last_sentences = '. '.join(text_sample.split('.')[-2:]).strip()
                if last_sentences and len(last_sentences) > 20:
                    # Use embedding service directly for semantic search
                    from .embedding_service import EmbeddingService
                    embedding_service = EmbeddingService(self.chunk_repo)
                    
                    similar_chunks = await embedding_service.semantic_search(
                        project_id=project_id,
                        query=last_sentences,
                        limit=3,
                        min_similarity=0.3
                    )
                    
                    if similar_chunks:
                        # Extract style samples from similar chunks
                        style_samples = [chunk.get('content', '')[:200] for chunk in similar_chunks]
                        context["style_samples"] = style_samples
                        logger.info(f"Found {len(style_samples)} style samples from RAG")
            except Exception as e:
                logger.warning(f"RAG search failed: {e}")
            
            # 4. Extract recent events (last paragraph)
            paragraphs = text_sample.split('\n\n')
            if paragraphs:
                context["recent_events"] = paragraphs[-1] if len(paragraphs[-1]) > 20 else None
            
            # 5. Get writing style from immediate context
            context["immediate_style"] = text_sample[-300:] if len(text_sample) > 300 else text_sample
            
            # 6. Analyze writing style characteristics
            style_analysis = self._analyze_writing_style(text_sample)
            context["style_characteristics"] = style_analysis
            
            return context
            
        except Exception as e:
            logger.warning(f"Error gathering story context: {e}")
            return {}
    
    def _analyze_writing_style(self, text: str) -> Dict[str, Any]:
        """
        Analyze writing style characteristics
        
        Args:
            text: Text to analyze
            
        Returns:
            Dict with style characteristics
        """
        try:
            # Calculate average sentence length
            sentences = [s.strip() for s in text.split('.') if s.strip()]
            avg_sentence_length = sum(len(s.split()) for s in sentences) / len(sentences) if sentences else 0
            
            # Detect POV
            pov = "third_person"
            if any(word in text.lower() for word in [' i ', ' my ', ' me ', ' mine ']):
                pov = "first_person"
            elif ' you ' in text.lower():
                pov = "second_person"
            
            # Detect tense (simple heuristic)
            past_tense_words = ['was', 'were', 'had', 'did', 'went', 'said', 'looked']
            present_tense_words = ['is', 'are', 'has', 'does', 'goes', 'says', 'looks']
            
            past_count = sum(1 for word in past_tense_words if word in text.lower())
            present_count = sum(1 for word in present_tense_words if word in text.lower())
            
            tense = "past" if past_count > present_count else "present"
            
            # Detect formality (simple heuristic)
            contractions = ["n't", "'ll", "'ve", "'re", "'m", "'d"]
            has_contractions = any(c in text for c in contractions)
            formality = "informal" if has_contractions else "formal"
            
            return {
                "avg_sentence_length": round(avg_sentence_length, 1),
                "pov": pov,
                "tense": tense,
                "formality": formality
            }
            
        except Exception as e:
            logger.warning(f"Error analyzing writing style: {e}")
            return {}
    
    async def _build_prompt(
        self,
        suggestion_type: str,
        text_before: str,
        text_after: str,
        story_context: Dict[str, Any]
    ) -> str:
        """
        Build prompt for LLM based on suggestion type and context
        
        Args:
            suggestion_type: Type of suggestion
            text_before: Text before cursor
            text_after: Text after cursor
            story_context: Story context dict
            
        Returns:
            Formatted prompt string
        """
        # Extract context elements
        characters = story_context.get("characters", [])
        location = story_context.get("location")
        themes = story_context.get("themes", [])
        style_samples = story_context.get("style_samples", [])
        style_chars = story_context.get("style_characteristics", {})
        
        # Build character context string with details
        char_context = ""
        if characters:
            char_details = []
            for char in characters[:3]:  # Top 3 characters
                name = char["name"]
                attrs = char.get("attributes", {})
                if attrs:
                    char_details.append(f"{name} ({', '.join(str(v) for v in attrs.values() if v)})")
                else:
                    char_details.append(name)
            char_context = f"\nCharacters present: {', '.join(char_details)}"
        
        # Build location context
        loc_context = f"\nCurrent location: {location}" if location else ""
        
        # Build theme context
        theme_context = f"\nThemes: {', '.join(themes)}" if themes else ""
        
        # Build style guidance
        style_guidance = ""
        if style_chars:
            pov = style_chars.get("pov", "third_person").replace("_", " ")
            tense = style_chars.get("tense", "past")
            formality = style_chars.get("formality", "informal")
            avg_length = style_chars.get("avg_sentence_length", 15)
            
            style_guidance = f"""
Writing Style Guidelines:
- Point of view: {pov}
- Tense: {tense} tense
- Tone: {formality}
- Average sentence length: ~{avg_length} words
- Match the author's voice and rhythm"""
        
        # Build style examples
        style_examples = ""
        if style_samples:
            style_examples = "\n\nAuthor's Writing Style Examples:"
            for i, sample in enumerate(style_samples[:2], 1):
                style_examples += f'\n{i}. "{sample}"'
        
        # Build prompt based on type
        if suggestion_type == "continue":
            prompt = f"""You are a creative writing assistant helping an author continue their story. Your goal is to write in EXACTLY the same style as the author.

Story Context:{char_context}{loc_context}{theme_context}{style_guidance}{style_examples}

Current text:
"{text_before[-400:]}"

Task: Continue this text naturally with 1-3 sentences. The continuation must:
1. Flow seamlessly from what came before
2. Match the author's EXACT writing style (tone, rhythm, vocabulary, sentence structure)
3. Maintain character consistency and voice
4. Keep the same POV and tense
5. Feel like it was written by the same author

CRITICAL:
- Do NOT repeat what's already written
- Do NOT add quotation marks around your response
- Do NOT add meta-commentary or explanations
- Just write the continuation directly as if you ARE the author
- Match sentence length and complexity to the author's style
- Use similar vocabulary and phrasing patterns

Continuation:"""

        elif suggestion_type == "complete":
            prompt = f"""You are a creative writing assistant helping an author complete a paragraph.

Story Context:{char_context}{loc_context}{style_guidance}

Current paragraph:
"{text_before[-300:]}"

Task: Complete this paragraph with 1-2 sentences that bring it to a natural conclusion. Match the author's exact writing style.

Completion:"""

        else:  # rewrite
            prompt = f"""You are a creative writing assistant helping an author improve their text while maintaining their unique voice.

Original text:
"{text_before[-200:]}"

Task: Rewrite this text to be more engaging while:
1. Keeping the same meaning
2. Maintaining the author's style and voice
3. Making it more vivid and descriptive

Rewritten version:"""
        
        return prompt
    
    def _clean_suggestion(self, suggestion: str) -> str:
        """
        Clean up LLM suggestion
        
        Args:
            suggestion: Raw suggestion from LLM
            
        Returns:
            Cleaned suggestion
        """
        # Remove leading/trailing whitespace
        cleaned = suggestion.strip()
        
        # Remove common LLM artifacts
        artifacts = [
            "Here's the continuation:",
            "Here is the continuation:",
            "Continuation:",
            "Here's a suggestion:",
            "I suggest:",
            "How about:",
        ]
        
        for artifact in artifacts:
            if cleaned.lower().startswith(artifact.lower()):
                cleaned = cleaned[len(artifact):].strip()
        
        # Remove quotes if the entire suggestion is quoted
        if cleaned.startswith('"') and cleaned.endswith('"'):
            cleaned = cleaned[1:-1]
        
        # Remove leading ellipsis
        if cleaned.startswith('...'):
            cleaned = cleaned[3:].strip()
        
        # Ensure it doesn't start with lowercase (unless intentional)
        # This is tricky - skip for now to preserve author intent
        
        return cleaned
    
    def _extract_last_sentence(self, text: str) -> str:
        """Extract the last incomplete sentence from text"""
        # Simple implementation - can be improved
        sentences = text.split('.')
        return sentences[-1].strip() if sentences else text
