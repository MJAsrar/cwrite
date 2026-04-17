"""
Unit tests for WebSearchService
"""
import pytest
import httpx
from unittest.mock import AsyncMock, Mock, patch

from app.services.web_search_service import SearchResult, WebSearchService


class _AsyncClientContext:
    """Simple async context manager for mocking httpx.AsyncClient."""

    def __init__(self, client):
        self.client = client

    async def __aenter__(self):
        return self.client

    async def __aexit__(self, exc_type, exc, tb):
        return False


class TestWebSearchService:
    """Unit tests for web search service."""

    @pytest.mark.asyncio
    async def test_search_success_maps_results_and_clamps_max_results(self):
        """Search should clamp max results and map API fields into SearchResult."""
        service = WebSearchService(api_key="test-key")

        mock_response = Mock()
        mock_response.raise_for_status = Mock()
        mock_response.json = Mock(return_value={
            "results": [
                {
                    "title": "Result A",
                    "url": "https://example.com/a",
                    "content": "Snippet A",
                    "score": 0.91,
                },
                {
                    # exercise default mapping when keys are missing
                    "url": "https://example.com/b",
                },
            ]
        })

        mock_client = Mock()
        mock_client.post = AsyncMock(return_value=mock_response)

        with patch(
            "app.services.web_search_service.httpx.AsyncClient",
            return_value=_AsyncClientContext(mock_client)
        ):
            results = await service.search(
                query="test query",
                max_results=20,
                search_depth="advanced",
                include_answer=True,
            )

        assert len(results) == 2
        assert results[0] == SearchResult(
            title="Result A",
            url="https://example.com/a",
            snippet="Snippet A",
            score=0.91,
        )
        assert results[1] == SearchResult(
            title="Untitled",
            url="https://example.com/b",
            snippet="",
            score=0.0,
        )

        _, call_kwargs = mock_client.post.call_args
        assert call_kwargs["json"]["max_results"] == 10
        assert call_kwargs["json"]["search_depth"] == "advanced"
        assert call_kwargs["json"]["include_answer"] is True

    @pytest.mark.asyncio
    async def test_search_raises_when_api_key_missing(self):
        """Search should fail fast when API key is not configured."""
        service = WebSearchService(api_key=None)
        service.api_key = None

        with pytest.raises(ValueError, match="API key not configured"):
            await service.search(query="test")

    @pytest.mark.asyncio
    async def test_search_reraises_http_status_error(self):
        """HTTP status errors should be propagated."""
        service = WebSearchService(api_key="test-key")

        request = httpx.Request("POST", "https://api.tavily.com/search")
        response = httpx.Response(401, request=request, text="unauthorized")
        http_error = httpx.HTTPStatusError(
            "request failed",
            request=request,
            response=response,
        )

        mock_response = Mock()
        mock_response.raise_for_status = Mock(side_effect=http_error)
        mock_client = Mock()
        mock_client.post = AsyncMock(return_value=mock_response)

        with patch(
            "app.services.web_search_service.httpx.AsyncClient",
            return_value=_AsyncClientContext(mock_client)
        ):
            with pytest.raises(httpx.HTTPStatusError):
                await service.search(query="test")

    @pytest.mark.asyncio
    async def test_search_reraises_timeout_exception(self):
        """Timeout exceptions should be propagated."""
        service = WebSearchService(api_key="test-key")

        mock_client = Mock()
        mock_client.post = AsyncMock(side_effect=httpx.TimeoutException("timed out"))

        with patch(
            "app.services.web_search_service.httpx.AsyncClient",
            return_value=_AsyncClientContext(mock_client)
        ):
            with pytest.raises(httpx.TimeoutException):
                await service.search(query="test")

    def test_format_results_for_llm_with_results(self):
        """Formatting should include source numbering and result fields."""
        service = WebSearchService(api_key="test-key")
        results = [
            SearchResult(
                title="Title 1",
                url="https://example.com/1",
                snippet="Snippet 1",
                score=0.5,
            ),
            SearchResult(
                title="Title 2",
                url="https://example.com/2",
                snippet="Snippet 2",
                score=0.6,
            ),
        ]

        formatted = service.format_results_for_llm(results)

        assert "=== Web Research Results ===" in formatted
        assert "[Source 1] Title 1" in formatted
        assert "URL: https://example.com/2" in formatted
        assert "Snippet 2" in formatted

    def test_format_results_for_llm_empty_results(self):
        """Formatting empty list should return sentinel message."""
        service = WebSearchService(api_key="test-key")

        formatted = service.format_results_for_llm([])

        assert formatted == "No web search results found."

    def test_is_available(self):
        """Availability depends on API key presence."""
        configured = WebSearchService(api_key="test-key")
        missing = WebSearchService(api_key=None)
        missing.api_key = None

        assert configured.is_available() is True
        assert missing.is_available() is False
