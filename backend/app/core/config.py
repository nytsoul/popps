"""ShopScale Backend — Application Configuration (Pydantic Settings v2)."""
from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_env: Literal["development", "staging", "production"] = "development"
    app_secret_key: str = Field(default="dev-insecure-key-change-in-production", min_length=16)
    debug: bool = True
    allowed_origins: str | list[str] = ["http://localhost:5173", "http://localhost:4173"]

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    # Database
    database_url: str = "postgresql+psycopg2://shopscale:shopscale@localhost:5432/shopscale"
    async_database_url: str = "postgresql+asyncpg://shopscale:shopscale@localhost:5432/shopscale"
    db_pool_size: int = 10
    db_max_overflow: int = 20
    db_pool_timeout: int = 30

    # Redis
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"
    cache_ttl_seconds: int = 300  # 5 minutes default

    # Auth
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 30
    algorithm: str = "HS256"

    # Admin bootstrap (dev only)
    bootstrap_admin_email: str = "admin@shopscale.dev"
    bootstrap_admin_password: str = "change-me"

    # Storage
    storage_adapter: Literal["local", "s3", "cloudinary"] = "local"
    local_upload_dir: str = "./uploads"
    max_upload_size_mb: int = 10
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_s3_bucket: str = ""
    aws_s3_region: str = "ap-south-1"
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""

    # Email
    email_adapter: Literal["console", "smtp", "sendgrid"] = "console"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    email_from: str = "noreply@shopscale.dev"
    sendgrid_api_key: str = ""

    # Payment
    payment_adapter: Literal["mock", "razorpay"] = "mock"
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""

    # Rate limiting
    rate_limit_default: str = "100/minute"
    rate_limit_auth: str = "10/minute"

    # Monitoring
    sentry_dsn: str = ""

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"


@lru_cache
def get_settings() -> Settings:
    """Return cached settings singleton."""
    return Settings()


settings = get_settings()
