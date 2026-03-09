"""
Web Search Service

Interfaces with Tavily Search API for real-time web research.
Returns structured search results that can be injected into LLM context.
"""

import os
import logging
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
import httpx

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    """A single web search result"""
    title: str
    url: str
    snippet: str
    score: float = 0.0


class WebSearchService:
    """Service for performing web searches via Tavily API"""

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize web search service

        Args:
            api_key: Tavily API key (defaults to TAVILY_API_KEY env var)
        """
        self.api_key = api_key or os.getenv("TAVILY_API_KEY") or "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"
        if not self.api_key:
            logger.warning("TAVILY_API_KEY not set. Web search will not function.")

        self.base_url = "https://api.tavily.com"

    async def search(
        self,
        query: str,
        max_results: int = 5,
        search_depth: str = "basic",
        include_answer: bool = False
    ) -> List[SearchResult]:
        """
        Search the web for information relevant to the query.

        Args:
            query: Natural language search query
            max_results: Maximum number of results to return (1-10)
            search_depth: "basic" (faster) or "advanced" (more thorough)
            include_answer: Whether to request Tavily's AI-generated answer

        Returns:
            List of SearchResult objects
        """
        if not self.api_key:
            raise ValueError("Tavily API key not configured")

        max_results = max(1, min(max_results, 10))

        payload = {
            "api_key": self.api_key,
            "query": query,
            "max_results": max_results,
            "search_depth": search_depth,
            "include_answer": include_answer,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/search",
                    json=payload
                )
                response.raise_for_status()
                data = response.json()

            results = []
            for item in data.get("results", []):
                results.append(SearchResult(
                    title=item.get("title", "Untitled"),
                    url=item.get("url", ""),
                    snippet=item.get("content", ""),
                    score=item.get("score", 0.0)
                ))

            logger.info(f"Web search returned {len(results)} results for query: {query[:80]}")
            return results

        except httpx.HTTPStatusError as e:
            logger.error(f"Tavily API error: {e.response.status_code} - {e.response.text}")
            raise
        except httpx.TimeoutException:
            logger.error(f"Tavily API timeout for query: {query[:80]}")
            raise
        except Exception as e:
            logger.error(f"Web search error: {str(e)}")
            raise

    def format_results_for_llm(self, results: List[SearchResult]) -> str:
        """
        Format search results into a context string for LLM consumption.

        Args:
            results: List of SearchResult objects

        Returns:
            Formatted context string
        """
        if not results:
            return "No web search results found."

        sections = ["=== Web Research Results ===\n"]

        for i, result in enumerate(results, 1):
            sections.append(
                f"[Source {i}] {result.title}\n"
                f"URL: {result.url}\n"
                f"{result.snippet}\n"
            )

        return "\n".join(sections)

    def is_available(self) -> bool:
        """Check if the web search service is properly configured"""
        return bool(self.api_key)
