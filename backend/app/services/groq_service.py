"""
Groq LLM Service

Interfaces with Groq API for fast LLM inference.
Supports streaming and non-streaming responses.
"""

import os
import logging
from typing import List, Dict, Optional, AsyncGenerator
import httpx
from datetime import datetime

logger = logging.getLogger(__name__)


class GroqService:
    """Service for interacting with Groq LLM API"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Groq service
        
        Args:
            api_key: Groq API key (defaults to GROQ_API_KEY env var)
        """
        self.api_key = os.getenv("GROQ_API_KEY")
        if not self.api_key:
            logger.warning("GROQ_API_KEY not set. Groq service will not function.")
        
        self.base_url = "https://api.groq.com/openai/v1"
        self.default_model = "llama-3.3-70b-versatile"  # Fast and capable
        
        # Model options:
        # - llama-3.3-70b-versatile: Best for creative writing, 128K context
        # - llama-3.1-70b-versatile: Good balance, 128K context
        # - mixtral-8x7b-32768: Fast, 32K context
        # - gemma2-9b-it: Lightweight, 8K context
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        stream: bool = False
    ) -> Dict:
        """
        Generate chat completion
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model name (defaults to llama-3.3-70b-versatile)
            temperature: Sampling temperature (0.0-2.0)
            max_tokens: Maximum tokens to generate
            stream: Whether to stream the response
            
        Returns:
            Completion response dict or generator if streaming
        """
        if not self.api_key:
            raise ValueError("Groq API key not configured")
        
        model = model or self.default_model
        
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream
        }
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                if stream:
                    # Streaming response
                    return await self._stream_completion(client, payload, headers)
                else:
                    # Non-streaming response
                    response = await client.post(
                        f"{self.base_url}/chat/completions",
                        json=payload,
                        headers=headers
                    )
                    response.raise_for_status()
                    return response.json()
        
        except httpx.HTTPStatusError as e:
            logger.error(f"Groq API error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Groq service error: {str(e)}")
            raise
    
    async def _stream_completion(
        self,
        client: httpx.AsyncClient,
        payload: Dict,
        headers: Dict
    ) -> AsyncGenerator[str, None]:
        """Stream completion chunks"""
        async with client.stream(
            "POST",
            f"{self.base_url}/chat/completions",
            json=payload,
            headers=headers
        ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    chunk = line[6:]  # Remove "data: " prefix
                    if chunk == "[DONE]":
                        break
                    yield chunk
    
    async def generate_response(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> str:
        """
        Generate a simple text response
        
        Args:
            prompt: User prompt
            system_prompt: Optional system prompt
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            
        Returns:
            Generated text
        """
        messages = []
        
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        messages.append({"role": "user", "content": prompt})
        
        response = await self.chat_completion(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        return response['choices'][0]['message']['content']
    
    async def generate_with_context(
        self,
        question: str,
        context: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> str:
        """
        Generate response with provided context (RAG)
        
        Args:
            question: User question
            context: Context information
            system_prompt: Optional system prompt
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            
        Returns:
            Generated text
        """
        default_system = """You are an AI assistant helping a writer understand and analyze their story.
You have access to the story content, characters, locations, scenes, and narrative structure.
Provide insightful, specific answers based on the context provided.
If you're not sure about something, say so rather than making it up."""
        
        system = system_prompt or default_system
        
        user_prompt = f"""Context:
{context}

Question: {question}

Please answer based on the context provided above."""
        
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user_prompt}
        ]
        
        response = await self.chat_completion(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        return response['choices'][0]['message']['content']
    
    async def continue_conversation(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> str:
        """
        Continue a multi-turn conversation
        
        Args:
            messages: Full conversation history
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            
        Returns:
            Generated response
        """
        response = await self.chat_completion(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        return response['choices'][0]['message']['content']
    
    def get_available_models(self) -> List[str]:
        """Get list of available Groq models"""
        return [
            "llama-3.3-70b-versatile",
            "llama-3.1-70b-versatile",
            "llama-3.1-8b-instant",
            "mixtral-8x7b-32768",
            "gemma2-9b-it"
        ]
    
    def estimate_tokens(self, text: str) -> int:
        """
        Rough token estimation (1 token ≈ 4 characters)
        
        Args:
            text: Text to estimate
            
        Returns:
            Estimated token count
        """
        return len(text) // 4

