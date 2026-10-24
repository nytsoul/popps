"""Security utilities: password hashing, JWT tokens."""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# Argon2id password hashing
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a plaintext password using Argon2id."""
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against the stored hash."""
    return pwd_context.verify(plain, hashed)


def create_access_token(subject: str, extra: dict[str, Any] | None = None) -> str:
    """Create a short-lived JWT access token."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload: dict[str, Any] = {
        "sub": subject,
        "exp": expire,
        "type": "access",
        **(extra or {}),
    }
    return jwt.encode(payload, settings.app_secret_key, algorithm=settings.algorithm)


def create_refresh_token(subject: str) -> tuple[str, datetime]:
    """Create a long-lived opaque refresh token. Returns (token, expiry)."""
    token = secrets.token_urlsafe(64)
    expiry = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    return token, expiry


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT access token. Raises JWTError on failure."""
    payload = jwt.decode(token, settings.app_secret_key, algorithms=[settings.algorithm])
    if payload.get("type") != "access":
        raise JWTError("Invalid token type")
    return payload
