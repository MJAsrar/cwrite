"""
HuggingFace Inference API Service

Provides genre-specific AI model inference via HuggingFace's Inference API.
Each writing genre maps to a specialized model for better writing assistance.
Falls back to Groq if HuggingFace is unavailable.
"""

import os
import logging
import asyncio
from typing import List, Dict, Optional, Any
import httpx

logger = logging.getLogger(__name__)


# Genre -> HuggingFace Model ID mapping
GENRE_MODEL_MAP = {
    "fantasy": "nbeerbower/mistral-nemo-gutenberg-12B-v4",
    "sci_fi": "Qwen/Qwen2.5-7B-Instruct",
    "romance": "nbeerbower/mistral-nemo-gutenberg-12B-v4",
    "thriller": "mistralai/Mistral-7B-Instruct-v0.3",
    "horror": "nbeerbower/mistral-nemo-gutenberg-12B-v4",
    "literary": "nbeerbower/mistral-nemo-gutenberg-12B-v4",
    "historical": "Qwen/Qwen2.5-7B-Instruct",
    "young_adult": "HuggingFaceH4/zephyr-7b-beta",
    "poetry": "nbeerbower/mistral-nemo-gutenberg-12B-v4",
    "screenwriting": "mistralai/Mistral-7B-Instruct-v0.3",
    "general": "Qwen/Qwen2.5-7B-Instruct",
}

# Genre-specific system prompts
GENRE_SYSTEM_PROMPTS = {
    "fantasy": (
        "You are an expert fantasy writing assistant. You understand worldbuilding, "
        "magic systems, mythological archetypes, and epic narrative structures. Help the "
        "writer craft vivid descriptions, develop complex lore, and maintain consistency "
        "in their fantasy world. Focus on atmosphere, wonder, and immersive prose."
    ),
    "sci_fi": (
        "You are an expert science fiction writing assistant. You excel at technical "
        "worldbuilding, speculative technology, and futuristic settings. Help the writer "
        "maintain scientific plausibility while crafting engaging narratives. Focus on "
        "ideas, logic, and speculative depth."
    ),
    "romance": (
        "You are an expert romance writing assistant. You understand emotional arcs, "
        "relationship dynamics, tension and chemistry between characters. Help the writer "
        "create compelling love interests, build emotional tension, and write authentic "
        "dialogue. Focus on emotion, vulnerability, and character connection."
    ),
    "thriller": (
        "You are an expert thriller/mystery writing assistant. You understand pacing, "
        "red herrings, clue placement, and tension building. Help the writer maintain "
        "suspense, create twists that feel earned, and keep readers guessing. Focus on "
        "pacing, stakes, and logical plot construction."
    ),
    "horror": (
        "You are an expert horror writing assistant. You understand atmospheric dread, "
        "psychological horror, and the mechanics of fear in prose. Help the writer build "
        "tension slowly, create unsettling imagery, and deliver effective scares. Focus "
        "on atmosphere, the unknown, and visceral reactions."
    ),
    "literary": (
        "You are an expert literary fiction writing assistant. You understand prose style, "
        "thematic depth, character interiority, and symbolism. Help the writer craft "
        "elegant sentences, develop complex themes, and find their unique voice. Focus "
        "on language, meaning, and artistic expression."
    ),
    "historical": (
        "You are an expert historical fiction writing assistant. You understand period-"
        "accurate details, historical research integration, and balancing fact with fiction. "
        "Help the writer weave historical events into compelling narratives while maintaining "
        "accuracy. Focus on authenticity and bringing the past to life."
    ),
    "young_adult": (
        "You are an expert YA fiction writing assistant. You understand the YA audience, "
        "coming-of-age themes, authentic teen voice, and age-appropriate content. Help "
        "the writer create relatable protagonists and navigate identity and growth themes. "
        "Focus on voice, relatability, and emotional honesty."
    ),
    "poetry": (
        "You are an expert poetry writing assistant. You understand meter, rhyme schemes, "
        "free verse, imagery, metaphor, sound devices, and poetic forms. Help the writer "
        "craft precise language, find powerful images, and experiment with form. Focus on "
        "compression, imagery, and the music of language."
    ),
    "screenwriting": (
        "You are an expert screenwriting assistant. You understand screenplay format, "
        "visual storytelling, dialogue craft, and scene structure. Help the writer write "
        "lean action lines, natural dialogue, and visually compelling scenes. Focus on "
        "showing not telling, subtext, and cinematic structure."
    ),
    "general": (
        "You are an intelligent writing assistant helping authors understand and analyze "
        "their stories. You have access to the story content, characters, locations, "
        "scenes, and narrative structure. Provide insightful, specific answers based on "
        "the context provided. If you're not sure about something, say so."
    ),
}

# Genre display metadata for the frontend
GENRE_METADATA = {
    "fantasy": {"label": "Fantasy", "emoji": "\U0001f9d9", "description": "Worldbuilding, magic systems, and epic narratives"},
    "sci_fi": {"label": "Science Fiction", "emoji": "\U0001f680", "description": "Speculative tech, futuristic settings, and ideas"},
    "romance": {"label": "Romance", "emoji": "\u2764\ufe0f", "description": "Emotional arcs, relationships, and chemistry"},
    "thriller": {"label": "Thriller / Mystery", "emoji": "\U0001f50e", "description": "Suspense, plot twists, and tension"},
    "horror": {"label": "Horror", "emoji": "\U0001f47b", "description": "Atmospheric dread, tension, and fear"},
    "literary": {"label": "Literary Fiction", "emoji": "\u270d\ufe0f", "description": "Prose style, themes, and character depth"},
    "historical": {"label": "Historical Fiction", "emoji": "\U0001f3f0", "description": "Period accuracy and historical narratives"},
    "young_adult": {"label": "Young Adult", "emoji": "\U0001f9d1\u200d\U0001f393", "description": "Coming-of-age, teen voice, and growth"},
    "poetry": {"label": "Poetry", "emoji": "\U0001fab6", "description": "Meter, imagery, and the music of language"},
    "screenwriting": {"label": "Screenwriting", "emoji": "\U0001f3ac", "description": "Visual storytelling and dialogue craft"},
    "general": {"label": "General", "emoji": "\U0001f30d", "description": "Blogs, mixed fiction, and general writing"},
}


class HuggingFaceService:
    """Service for genre-specific AI inference via HuggingFace Inference API"""

    def __init__(self, api_token: Optional[str] = None):
        self.api_token = os.getenv("HF_API_TOKEN")
        if not self.api_token:
            logger.warning("HF_API_TOKEN not set. HuggingFace service will not function.")

        # New OpenAI-compatible endpoint
        self.base_url = "https://router.huggingface.co/v1/chat/completions"
        self.max_retries = 3
        self.retry_delay = 5

    def get_model_for_genre(self, genre: str) -> str:
        """Get the HuggingFace model ID for a given genre"""
        return GENRE_MODEL_MAP.get(genre, GENRE_MODEL_MAP["general"])

    def get_system_prompt_for_genre(self, genre: str) -> str:
        """Get the genre-specific system prompt"""
        return GENRE_SYSTEM_PROMPTS.get(genre, GENRE_SYSTEM_PROMPTS["general"])

    def get_genre_metadata(self) -> Dict[str, Any]:
        """Get all genre metadata for frontend display"""
        return GENRE_METADATA

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        genre: str = "general",
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ) -> Dict[str, Any]:
        """
        Generate chat completion using genre-specific HuggingFace model.
        Uses the OpenAI-compatible router.huggingface.co/v1/chat/completions endpoint.

        Returns dict in OpenAI-compatible format:
        {"choices": [{"message": {"role": "assistant", "content": "..."}}]}
        """
        if not self.api_token:
            raise ValueError("HuggingFace API token not configured")

        model_id = model or self.get_model_for_genre(genre)

        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json",
        }

        # OpenAI-compatible payload — model in body, messages array directly
        payload = {
            "model": model_id,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        for attempt in range(self.max_retries):
            try:
                async with httpx.AsyncClient(timeout=120.0) as client:
                    response = await client.post(self.base_url, json=payload, headers=headers)

                    if response.status_code == 503:
                        try:
                            error_data = response.json()
                            wait_time = error_data.get("estimated_time", self.retry_delay)
                        except Exception:
                            wait_time = self.retry_delay
                        logger.info(
                            f"HF model {model_id} is loading, waiting {wait_time:.0f}s "
                            f"(attempt {attempt + 1}/{self.max_retries})"
                        )
                        await asyncio.sleep(min(wait_time, 30))
                        continue

                    if response.status_code == 429:
                        logger.warning(f"HF rate limited on model {model_id}")
                        raise Exception(f"HuggingFace rate limit exceeded for {model_id}")

                    response.raise_for_status()
                    result = response.json()

                    # Response is already in OpenAI format, return directly
                    return result

            except httpx.HTTPStatusError as e:
                logger.error(f"HF API error: {e.response.status_code} - {e.response.text}")
                raise
            except Exception as e:
                if "rate limit" in str(e).lower():
                    raise
                if attempt == self.max_retries - 1:
                    logger.error(f"HF error after {self.max_retries} attempts: {str(e)}")
                    raise
                logger.warning(f"HF attempt {attempt + 1} failed: {str(e)}, retrying...")

        raise Exception(f"HuggingFace API failed after {self.max_retries} attempts")

    async def generate_response(
        self,
        prompt: str,
        genre: str = "general",
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ) -> str:
        """Generate a simple text response using genre-specific model."""
        system = system_prompt or self.get_system_prompt_for_genre(genre)

        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ]

        response = await self.chat_completion(
            messages=messages,
            genre=genre,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        return response["choices"][0]["message"]["content"]

    def get_available_genres(self) -> List[Dict[str, Any]]:
        """Get list of all available genres with metadata and model info."""
        genres = []
        for genre_key, meta in GENRE_METADATA.items():
            genres.append({
                "id": genre_key,
                "label": meta["label"],
                "emoji": meta["emoji"],
                "description": meta["description"],
                "model": GENRE_MODEL_MAP.get(genre_key, ""),
            })
        return genres

