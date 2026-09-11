"""
Central runtime configuration, loaded from environment / .env.
Every real-integration knob (carrier credentials, LLM key/model, feature
toggles) lives here so nothing is hardcoded in the agent or tool layers.
"""
import os
from dotenv import load_dotenv

load_dotenv()


def _bool_env(name: str, default: bool) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return val.strip().lower() in ("1", "true", "yes", "on")


class Settings:
    # Nokia Network-as-Code (CAMARA) — RapidAPI-hosted sandbox
    NOKIA_NAC_API_KEY: str = os.getenv("NOKIA_NAC_API_KEY", "")
    NOKIA_NAC_RAPIDAPI_HOST: str = os.getenv("NOKIA_NAC_RAPIDAPI_HOST", "network-as-code.nokia.rapidapi.com")
    MOCK_CARRIER_MODE: bool = _bool_env("MOCK_CARRIER_MODE", True)
    # Where the operator redirects the end-user's device after they grant
    # (or refuse) Number Verification consent in the fast-authorization flow.
    NUMBER_VERIFICATION_REDIRECT_URI: str = os.getenv(
        "NUMBER_VERIFICATION_REDIRECT_URI", "http://localhost:8000/v1/number-verification/redirect"
    )

    # OpenRouter LLM agent
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
    OPENROUTER_BASE_URL: str = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    LLM_AGENT_ENABLED: bool = _bool_env("LLM_AGENT_ENABLED", True)


settings = Settings()
