from __future__ import annotations

import os
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = PROJECT_ROOT / ".env"
load_dotenv(ENV_FILE)


class ConfigurationError(RuntimeError):
    """Raised when required environment variables are missing or invalid."""


@dataclass(frozen=True)
class DatabaseConfig:
    host: str
    port: int
    name: str
    user: str
    password: str
    max_connections: int = 5

    def as_psycopg2_dict(self) -> dict:
        return {
            "host": self.host,
            "port": self.port,
            "database": self.name,
            "user": self.user,
            "password": self.password,
        }


@dataclass(frozen=True)
class EmbeddingConfig:
    model_name: str
    top_k: int
    relevance_threshold: float


@dataclass(frozen=True)
class LLMConfig:
    provider: str  # "ollama" | "openai"
    model_name: str
    # Ollama
    ollama_base_url: Optional[str]
    # OpenAI
    openai_api_key: Optional[str]
    temperature: float = 0.3
    max_tokens: int = 1500


@dataclass(frozen=True)
class ServerConfig:
    host: str
    port: int
    allowed_origins: list[str]
    session_timeout_minutes: int


@dataclass(frozen=True)
class AppConfig:
    db: DatabaseConfig
    embedding: EmbeddingConfig
    llm: LLMConfig
    server: ServerConfig


def _require(key: str) -> str:
    value = os.getenv(key)
    if not value or not value.strip():
        raise ConfigurationError(key)
    return value.strip()


def _optional(key: str, fallback: str) -> str:
    return (os.getenv(key) or fallback).strip()


def _optional_int(key: str, fallback: int) -> int:
    raw = os.getenv(key)
    if not raw:
        return fallback
    try:
        return int(raw)
    except ValueError:
        raise ConfigurationError(f"{key} must be an integer, got: {raw!r}")


def _optional_float(key: str, fallback: float) -> float:
    raw = os.getenv(key)
    if not raw:
        return fallback
    try:
        return float(raw)
    except ValueError:
        raise ConfigurationError(f"{key} must be a float, got: {raw!r}")


def _load_config() -> AppConfig:
    missing: list[str] = []

    def safe_require(key: str) -> str:
        try:
            return _require(key)
        except ConfigurationError:
            missing.append(key)
            return ""

    db_host = safe_require("DB_HOST")
    db_user = safe_require("DB_USER")
    db_name = safe_require("DB_NAME")

    # Normalize DB_PASSWORD / DB_PASS → DB_PASSWORD wins
    db_password = os.getenv("DB_PASSWORD") or os.getenv("DB_PASS")
    if not db_password:
        missing.append("DB_PASSWORD")

    llm_provider = _optional("LLM_PROVIDER", "openai").lower()
    if llm_provider not in ("ollama", "openai"):
        missing.append("LLM_PROVIDER (must be 'ollama' or 'openai')")

    openai_api_key: Optional[str] = None
    ollama_base_url: Optional[str] = None

    if llm_provider == "openai":
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            missing.append("OPENAI_API_KEY")
    else:
        ollama_base_url = safe_require("OLLAMA_BASE_URL")

    if missing:
        raise ConfigurationError(
            f"Missing required environment variables:\n"
            + "\n".join(f"  - {k}" for k in missing)
        )

    cors_raw = _optional("CORS_ORIGIN", "http://localhost:3000")
    allowed_origins = [o.strip() for o in cors_raw.split(",") if o.strip()]

    return AppConfig(
        db=DatabaseConfig(
            host=db_host,
            port=_optional_int("DB_PORT", 5432),
            name=db_name,
            user=db_user,
            password=db_password,  # type: ignore[arg-type]
            max_connections=_optional_int("DB_MAX_CONNECTIONS", 5),
        ),
        embedding=EmbeddingConfig(
            model_name=_optional("EMBEDDING_MODEL", "BAAI/bge-m3"),
            top_k=_optional_int("RAG_TOP_K", 10),
            relevance_threshold=_optional_float("RAG_RELEVANCE_THRESHOLD", 0.0),
        ),
        llm=LLMConfig(
            provider=llm_provider,
            model_name=safe_require("MODEL_NAME") if llm_provider == "ollama" else _optional("MODEL_NAME", "gpt-4o-mini"),
            ollama_base_url=ollama_base_url,
            openai_api_key=openai_api_key,
            temperature=_optional_float("LLM_TEMPERATURE", 0.3),
            max_tokens=_optional_int("LLM_MAX_TOKENS", 1500),
        ),
        server=ServerConfig(
            host=_optional("SERVER_HOST", "0.0.0.0"),
            port=_optional_int("PORT", 8000),
            allowed_origins=allowed_origins,
            session_timeout_minutes=_optional_int("SESSION_TIMEOUT_MINUTES", 60),
        ),
    )


try:
    cfg = _load_config()
except ConfigurationError as _e:
    print(f"\n❌ CONFIGURATION ERROR:\n{_e}\n", file=sys.stderr)
    sys.exit(1)
