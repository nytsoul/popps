"""
ShopScale — Redis Cache Service
Real Redis-backed cache with in-memory fallback, hit/miss tracking,
TTL management, and key invalidation.
"""
from __future__ import annotations

import json
import time
from collections import OrderedDict
from typing import Any

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class CacheStats:
    """Track cache hit/miss/invalidation statistics."""
    __slots__ = ("hits", "misses", "bypassed", "invalidations", "errors")

    def __init__(self):
        self.hits = 0
        self.misses = 0
        self.bypassed = 0
        self.invalidations = 0
        self.errors = 0

    def to_dict(self) -> dict:
        return {
            "hits": self.hits,
            "misses": self.misses,
            "bypassed": self.bypassed,
            "invalidations": self.invalidations,
            "errors": self.errors,
            "total_requests": self.hits + self.misses + self.bypassed,
            "hit_rate": round(self.hits / max(1, self.hits + self.misses) * 100, 2),
        }

    def reset(self):
        self.hits = 0
        self.misses = 0
        self.bypassed = 0
        self.invalidations = 0
        self.errors = 0


class InMemoryCache:
    """Simple in-memory LRU cache used as fallback when Redis is unavailable."""

    def __init__(self, max_size: int = 1000):
        self._store: OrderedDict[str, tuple[Any, float]] = OrderedDict()
        self._max_size = max_size

    def get(self, key: str) -> Any | None:
        entry = self._store.get(key)
        if entry is None:
            return None
        value, expires = entry
        if expires < time.time():
            del self._store[key]
            return None
        self._store.move_to_end(key)
        return value

    def set(self, key: str, value: Any, ttl: int = 300) -> None:
        if key in self._store:
            del self._store[key]
        elif len(self._store) >= self._max_size:
            self._store.popitem(last=False)
        self._store[key] = (value, time.time() + ttl)

    def delete(self, key: str) -> bool:
        if key in self._store:
            del self._store[key]
            return True
        return False

    def delete_pattern(self, pattern: str) -> int:
        """Delete keys matching a prefix pattern (e.g. 'product:*')."""
        prefix = pattern.rstrip("*")
        to_remove = [k for k in self._store if k.startswith(prefix)]
        for k in to_remove:
            del self._store[k]
        return len(to_remove)

    def flush(self) -> int:
        n = len(self._store)
        self._store.clear()
        return n

    def size(self) -> int:
        return len(self._store)

    def keys(self, pattern: str = "*") -> list[str]:
        if pattern == "*":
            return list(self._store.keys())
        prefix = pattern.rstrip("*")
        return [k for k in self._store if k.startswith(prefix)]


class RedisCacheService:
    """
    Redis cache service with in-memory fallback.

    Usage:
        cache = get_cache_service()
        value = cache.get("product:slug:kanchipuram-silk")
        if value is None:
            value = fetch_from_db(...)
            cache.set("product:slug:kanchipuram-silk", value, ttl=300)
    """

    NAMESPACE = "shopscale"

    def __init__(self):
        self._redis = None
        self._fallback = InMemoryCache()
        self.stats = CacheStats()
        self._bypass = False
        self._default_ttl = settings.cache_ttl_seconds
        self._connect()

    def _connect(self) -> None:
        """Attempt to connect to Redis."""
        try:
            import redis as redis_lib
            self._redis = redis_lib.from_url(
                settings.redis_url,
                socket_connect_timeout=2,
                socket_timeout=2,
                decode_responses=True,
            )
            self._redis.ping()
            logger.info("Redis cache connected", url=settings.redis_url.split("@")[-1])
        except Exception as e:
            self._redis = None
            logger.warning("Redis unavailable, using in-memory cache", error=str(e))

    def _key(self, key: str) -> str:
        """Namespace cache keys to avoid collisions."""
        return f"{self.NAMESPACE}:{key}"

    @property
    def is_redis_connected(self) -> bool:
        if self._redis is None:
            return False
        try:
            self._redis.ping()
            return True
        except Exception:
            self._redis = None
            return False

    @property
    def backend_name(self) -> str:
        return "redis" if self.is_redis_connected else "in-memory"

    def set_bypass(self, enabled: bool) -> None:
        self._bypass = enabled

    def get(self, key: str) -> Any | None:
        """Get a value from cache. Returns None on miss."""
        if self._bypass:
            self.stats.bypassed += 1
            return None

        namespaced_key = self._key(key)

        if self._redis:
            try:
                raw = self._redis.get(namespaced_key)
                if raw is None:
                    self.stats.misses += 1
                    return None
                self.stats.hits += 1
                return json.loads(raw)
            except Exception as e:
                self.stats.errors += 1
                logger.warning("Redis get error, falling back", key=key, error=str(e))
                self._redis = None

        # In-memory fallback
        value = self._fallback.get(namespaced_key)
        if value is None:
            self.stats.misses += 1
        else:
            self.stats.hits += 1
        return value

    def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        """Set a value in cache with TTL."""
        ttl = ttl or self._default_ttl
        namespaced_key = self._key(key)
        serialized = json.dumps(value, default=str)

        if self._redis:
            try:
                self._redis.setex(namespaced_key, ttl, serialized)
                return
            except Exception as e:
                self.stats.errors += 1
                logger.warning("Redis set error, falling back", key=key, error=str(e))
                self._redis = None

        self._fallback.set(namespaced_key, value, ttl)

    def delete(self, key: str) -> bool:
        """Delete a specific key from cache."""
        namespaced_key = self._key(key)

        if self._redis:
            try:
                result = self._redis.delete(namespaced_key)
                if result:
                    self.stats.invalidations += 1
                return bool(result)
            except Exception as e:
                self.stats.errors += 1
                self._redis = None

        removed = self._fallback.delete(namespaced_key)
        if removed:
            self.stats.invalidations += 1
        return removed

    def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate all keys matching a prefix pattern."""
        namespaced_pattern = self._key(pattern)
        removed = 0

        if self._redis:
            try:
                # Use SCAN for production-safe pattern matching
                cursor = 0
                keys_to_delete = []
                while True:
                    cursor, keys = self._redis.scan(
                        cursor=cursor,
                        match=namespaced_pattern,
                        count=100,
                    )
                    keys_to_delete.extend(keys)
                    if cursor == 0:
                        break
                if keys_to_delete:
                    removed = self._redis.delete(*keys_to_delete)
                self.stats.invalidations += removed
                return removed
            except Exception as e:
                self.stats.errors += 1
                self._redis = None

        removed = self._fallback.delete_pattern(namespaced_pattern)
        self.stats.invalidations += removed
        return removed

    delete_pattern = invalidate_pattern


    def invalidate_product(self, product_slug: str | None = None, product_id: str | None = None) -> int:
        """Invalidate cache entries related to a product."""
        removed = 0
        if product_slug:
            removed += self.delete(f"product:slug:{product_slug}")
        if product_id:
            removed += self.delete(f"product:id:{product_id}")
        # Also invalidate catalogue/list caches
        removed += self.invalidate_pattern("catalogue:*")
        removed += self.invalidate_pattern("products:list:*")
        return removed

    def invalidate_catalogue(self) -> int:
        """Invalidate all catalogue/listing caches."""
        removed = self.invalidate_pattern("catalogue:*")
        removed += self.invalidate_pattern("products:list:*")
        return removed

    def flush_namespace(self) -> int:
        """Flush all keys in the ShopScale namespace (admin operation)."""
        return self.invalidate_pattern("*")

    def get_stats(self) -> dict:
        """Return cache statistics and backend info."""
        result = self.stats.to_dict()
        result["backend"] = self.backend_name
        result["bypass_enabled"] = self._bypass
        result["default_ttl"] = self._default_ttl

        if self._redis:
            try:
                # Count keys in our namespace
                cursor, keys = self._redis.scan(
                    cursor=0, match=f"{self.NAMESPACE}:*", count=100
                )
                key_count = len(keys)
                while cursor:
                    cursor, more_keys = self._redis.scan(
                        cursor=cursor, match=f"{self.NAMESPACE}:*", count=100
                    )
                    key_count += len(more_keys)
                result["cached_keys"] = key_count
            except Exception:
                result["cached_keys"] = "unavailable"
        else:
            result["cached_keys"] = self._fallback.size()

        return result

    def health_check(self) -> dict:
        """Check cache backend health."""
        if self._redis:
            try:
                start = time.time()
                self._redis.ping()
                latency_ms = round((time.time() - start) * 1000, 2)
                return {
                    "status": "healthy",
                    "backend": "redis",
                    "latency_ms": latency_ms,
                }
            except Exception as e:
                return {
                    "status": "unhealthy",
                    "backend": "redis",
                    "error": str(e),
                }
        return {
            "status": "degraded",
            "backend": "in-memory",
            "note": "Redis not connected; using in-memory fallback cache",
        }


# Singleton
_cache_service: RedisCacheService | None = None


def get_cache_service() -> RedisCacheService:
    """Get or create the cache service singleton."""
    global _cache_service
    if _cache_service is None:
        _cache_service = RedisCacheService()
    return _cache_service


def reset_cache_service() -> None:
    """Reset the cache service singleton (for testing)."""
    global _cache_service
    _cache_service = None
