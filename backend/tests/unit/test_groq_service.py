"""
Unit tests for GroqService
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch
import httpx


class TestGroqService:
    """Unit tests for Groq LLM service"""
    
    @pytest.mark.asyncio
    async def test_chat_completion_success(self):
        """Test successful chat completion"""
        from app.services.groq_service import GroqService
        
        service = GroqService()
        
        # Mock httpx client
        mock_response = Mock()
        mock_response.json.return_value = {
            'choices': [{
                'message': {
                    'content': 'Test response'
                }
            }]
        }
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)
            
            messages = [{"role": "user", "content": "Hello"}]
            result = await service.chat_completion(messages)
            
            assert 'choices' in result
            assert result['choices'][0]['message']['content'] == 'Test response'
    
    @pytest.mark.asyncio
    async def test_generate_response(self):
        """Test simple response generation"""
        from app.services.groq_service import GroqService
        
        service = GroqService()
        service.chat_completion = AsyncMock(return_value={
            'choices': [{
                'message': {
                    'content': 'Generated response'
                }
            }]
        })
        
        result = await service.generate_response("Test prompt")
        
        assert result == 'Generated response'
        assert service.chat_completion.called
    
    @pytest.mark.asyncio
    async def test_generate_with_context(self):
        """Test RAG-style generation with context"""
        from app.services.groq_service import GroqService
        
        service = GroqService()
        service.chat_completion = AsyncMock(return_value={
            'choices': [{
                'message': {
                    'content': 'Context-aware response'
                }
            }]
        })
        
        result = await service.generate_with_context(
            question="Who is Alice?",
            context="Alice is a character in the story."
        )
        
        assert result == 'Context-aware response'
        assert service.chat_completion.called
    
    @pytest.mark.asyncio
    async def test_continue_conversation(self):
        """Test multi-turn conversation"""
        from app.services.groq_service import GroqService
        
        service = GroqService()
        service.chat_completion = AsyncMock(return_value={
            'choices': [{
                'message': {
                    'content': 'Conversation response'
                }
            }]
        })
        
        messages = [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there!"},
            {"role": "user", "content": "How are you?"}
        ]
        
        result = await service.continue_conversation(messages)
        
        assert result == 'Conversation response'
    
    def test_get_available_models(self):
        """Test getting available models"""
        from app.services.groq_service import GroqService
        
        service = GroqService()
        models = service.get_available_models()
        
        assert isinstance(models, list)
        assert len(models) > 0
        assert "llama-3.3-70b-versatile" in models
    
    def test_estimate_tokens(self):
        """Test token estimation"""
        from app.services.groq_service import GroqService
        
        service = GroqService()
        
        # Test short text
        tokens = service.estimate_tokens("Hello world")
        assert tokens > 0
        assert tokens < 10
        
        # Test longer text
        long_text = "This is a longer text " * 50
        tokens = service.estimate_tokens(long_text)
        assert tokens > 100
    
    @pytest.mark.asyncio
    async def test_chat_completion_no_api_key(self):
        """Test error when API key is missing"""
        from app.services.groq_service import GroqService
        
        service = GroqService()
        service.api_key = None
        
        with pytest.raises(ValueError, match="API key not configured"):
            await service.chat_completion([{"role": "user", "content": "test"}])
    
    @pytest.mark.asyncio
    async def test_chat_completion_http_error(self):
        """Test handling of HTTP errors"""
        from app.services.groq_service import GroqService
        
        service = GroqService()
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = Mock()
            mock_response.status_code = 500
            mock_response.text = "Internal Server Error"
            
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                side_effect=httpx.HTTPStatusError("Error", request=Mock(), response=mock_response)
            )
            
            with pytest.raises(httpx.HTTPStatusError):
                await service.chat_completion([{"role": "user", "content": "test"}])
