"""SAFEBRIDGE_LLM_PROVIDER 로 공급자를 고른다: claude | ollama | mock."""
from functools import lru_cache

from app.core.config import get_settings

from .base import LLMProvider


@lru_cache
def get_provider() -> LLMProvider:
    s = get_settings()
    if s.llm_provider == "claude":
        from .claude import ClaudeProvider

        return ClaudeProvider(s.claude_model, s.claude_effort, s.llm_timeout)
    if s.llm_provider == "ollama":
        from .ollama import OllamaProvider

        return OllamaProvider(s.ollama_url, s.ollama_model, s.llm_timeout)
    from .mock import MockProvider

    return MockProvider()
