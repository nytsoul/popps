"""
ShopScale — Rate Limiting Middleware
High-performance Redis-backed sliding-window rate limiter with in-memory fallback.
"""
from __future__ import annotations

import time
from collections import defaultdict
from typing import Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Fallback in-memory store if Redis is unavailable
_memory_store: dict[str, list[float]] = defaultdict(list)


def parse_rate(rate_str: str) -> tuple[int, int]:
    """Parses '100/minute' or '10/second' into (limit, window_seconds)."""
    try:
        parts = rate_str.strip().lower().split("/")
        limit = int(parts[0])
        unit = parts[1] if len(parts) > 1 else "minute"
        window = 60
        if "sec" in unit:
            window = 1
        elif "min" in unit:
            window = 60
        elif "hour" in unit:
            window = 3600
        elif "day" in unit:
            window = 86400
        return limit, window
    except Exception:
        return 500, 60


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, default_rate: str = "500/minute", auth_rate: str = "50/minute"):
        super().__init__(app)
        self.default_limit, self.default_window = parse_rate(default_rate)
        self.auth_limit, self.auth_window = parse_rate(auth_rate)
        self._redis = None
        self._init_redis()

    def _init_redis(self):
        try:
            import redis
            self._redis = redis.from_url(settings.redis_url, socket_connect_timeout=1)
            self._redis.ping()
        except Exception:
            self._redis = None

    def _get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        if request.client:
            return request.client.host
        return "127.0.0.1"

    def _check_rate_limit(self, client_id: str, limit: int, window: int) -> tuple[bool, int, int]:
        """
        Returns (is_allowed, remaining_tokens, retry_after_seconds).
        """
        now = time.time()
        # 1. Try Redis sliding window
        if self._redis:
            try:
                key = f"ratelimit:{client_id}:{window}"
                pipe = self._redis.pipeline()
                pipe.zremrangebyscore(key, 0, now - window)
                pipe.zadd(key, {f"{now}:{time.perf_counter()}": now})
                pipe.zcard(key)
                pipe.expire(key, window + 5)
                results = pipe.execute()
                current_count = results[2]
                remaining = max(0, limit - current_count)
                if current_count > limit:
                    return False, 0, int(window - (now % window)) or 1
                return True, remaining, 0
            except Exception:
                # Fall through to in-memory
                self._redis = None

        # 2. In-memory fallback
        window_start = now - window
        timestamps = _memory_store[client_id]
        # Purge expired timestamps
        valid_timestamps = [t for t in timestamps if t > window_start]
        valid_timestamps.append(now)
        _memory_store[client_id] = valid_timestamps
        current_count = len(valid_timestamps)
        remaining = max(0, limit - current_count)
        if current_count > limit:
            return False, 0, int(window - (now % window)) or 1
        return True, remaining, 0

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path

        # Exempt static assets, docs, and health checks
        exempt_prefixes = (
            "/api/docs",
            "/api/redoc",
            "/api/openapi.json",
            "/api/v1/health",
            "/api/v1/ready",
            "/uploads/",
            "/static/",
            "/favicon.ico",
        )
        if path.startswith(exempt_prefixes):
            return await call_next(request)

        # Rate limit determination
        client_ip = self._get_client_ip(request)
        is_auth = path.startswith(("/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/token"))
        limit = self.auth_limit if is_auth else self.default_limit
        window = self.auth_window if is_auth else self.default_window

        bucket_key = f"{client_ip}:{'auth' if is_auth else 'api'}"
        allowed, remaining, retry_after = self._check_rate_limit(bucket_key, limit, window)

        if not allowed:
            logger.warning("Rate limit exceeded", client=client_ip, path=path)
            headers = {
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(int(time.time() + retry_after)),
            }
            return JSONResponse(
                status_code=429,
                content={
                    "status": 429,
                    "message": f"You're browsing a little fast — our rate limiter paused requests. Please wait about {retry_after}s and try again.",
                    "retry_after": retry_after,
                },
                headers=headers,
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(time.time() + window))
        return response
