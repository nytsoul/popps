"""
ShopScale — Kafka Event Service
Real Kafka producer/consumer integration with idempotent processing,
retry logic, DLQ handling, and graceful degradation.
"""
from __future__ import annotations

import json
import time
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Callable

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Standard event topics
TOPICS = [
    "orders.created",
    "inventory.reserved",
    "notifications.requested",
    "orders.status-updated",
    "analytics.recorded",
    "dlq",
]

# Default config
DEFAULT_KAFKA_BOOTSTRAP_SERVERS = "localhost:9092"
MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 2  # seconds


class KafkaEvent:
    """Represents a Kafka event with metadata."""
    __slots__ = (
        "id", "topic", "key", "payload", "timestamp", "attempts",
        "state", "consumer_group", "note", "correlation_id",
    )

    def __init__(
        self,
        topic: str,
        key: str,
        payload: dict[str, Any],
        correlation_id: str | None = None,
    ):
        self.id = str(uuid.uuid4())
        self.topic = topic
        self.key = key
        self.payload = payload
        self.timestamp = datetime.now(timezone.utc).isoformat()
        self.attempts = 0
        self.state = "queued"
        self.consumer_group: str | None = None
        self.note: str | None = None
        self.correlation_id = correlation_id or str(uuid.uuid4())

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "topic": self.topic,
            "key": self.key,
            "payload": self.payload,
            "timestamp": self.timestamp,
            "attempts": self.attempts,
            "state": self.state,
            "consumer_group": self.consumer_group,
            "note": self.note,
            "correlation_id": self.correlation_id,
        }


class EventStats:
    """Track event processing statistics per topic."""

    def __init__(self):
        self.published: dict[str, int] = defaultdict(int)
        self.processed: dict[str, int] = defaultdict(int)
        self.failed: dict[str, int] = defaultdict(int)
        self.retried: dict[str, int] = defaultdict(int)
        self.duplicates: dict[str, int] = defaultdict(int)
        self.dlq_count: int = 0

    def to_dict(self) -> dict:
        result = []
        for topic in TOPICS:
            result.append({
                "topic": topic,
                "published": self.published.get(topic, 0),
                "processed": self.processed.get(topic, 0),
                "failed": self.failed.get(topic, 0),
                "retried": self.retried.get(topic, 0),
                "duplicates": self.duplicates.get(topic, 0),
                "lag": max(0, self.published.get(topic, 0) - self.processed.get(topic, 0) - self.failed.get(topic, 0)),
            })
        return {"topics": result, "dlq_count": self.dlq_count}


class KafkaProducer:
    """Kafka producer with connection management."""

    def __init__(self, bootstrap_servers: str):
        self._bootstrap_servers = bootstrap_servers
        self._producer = None
        self._connected = False

    def connect(self) -> bool:
        """Attempt to connect to Kafka broker."""
        try:
            from kafka import KafkaProducer as KProducer
            self._producer = KProducer(
                bootstrap_servers=self._bootstrap_servers,
                value_serializer=lambda v: json.dumps(v, default=str).encode("utf-8"),
                key_serializer=lambda k: k.encode("utf-8") if k else None,
                acks="all",
                retries=3,
                max_in_flight_requests_per_connection=1,
                request_timeout_ms=10000,
            )
            self._connected = True
            logger.info("Kafka producer connected", servers=self._bootstrap_servers)
            return True
        except Exception as e:
            self._connected = False
            logger.warning("Kafka producer connection failed", error=str(e))
            return False

    def send(self, topic: str, key: str, value: dict) -> bool:
        """Send a message to a Kafka topic."""
        if not self._producer:
            return False
        try:
            future = self._producer.send(topic, key=key, value=value)
            future.get(timeout=10)
            return True
        except Exception as e:
            logger.error("Kafka send failed", topic=topic, key=key, error=str(e))
            self._connected = False
            return False

    def flush(self) -> None:
        if self._producer:
            try:
                self._producer.flush(timeout=5)
            except Exception:
                pass

    def close(self) -> None:
        if self._producer:
            try:
                self._producer.close(timeout=5)
            except Exception:
                pass
            self._producer = None
            self._connected = False

    @property
    def is_connected(self) -> bool:
        return self._connected


class InMemoryEventBus:
    """In-memory event bus used when Kafka is not available.
    Provides the same interface for development/testing."""

    def __init__(self):
        self.events: list[KafkaEvent] = []
        self.consumers: dict[str, list[Callable]] = defaultdict(list)
        self.processed_keys: dict[str, set[str]] = defaultdict(set)
        self.stats = EventStats()

    def publish(self, event: KafkaEvent) -> bool:
        self.events.append(event)
        self.stats.published[event.topic] += 1
        event.state = "published"
        # Deliver to registered consumers
        for handler in self.consumers.get(event.topic, []):
            self._deliver(event, handler)
        return True

    def _deliver(self, event: KafkaEvent, handler: Callable) -> None:
        dedup_key = f"{event.topic}:{event.key}"
        group = getattr(handler, "_consumer_group", "default")

        if dedup_key in self.processed_keys[group]:
            event.state = "duplicate"
            event.note = "Idempotency key already processed — skipped"
            self.stats.duplicates[event.topic] += 1
            return

        event.attempts += 1
        event.state = "processing"
        try:
            handler(event)
            self.processed_keys[group].add(dedup_key)
            event.state = "processed"
            event.note = "OK"
            self.stats.processed[event.topic] += 1
        except Exception as e:
            if event.attempts < MAX_RETRIES:
                event.state = "retrying"
                event.note = f"Retry {event.attempts}/{MAX_RETRIES}"
                self.stats.retried[event.topic] += 1
                self._deliver(event, handler)
            else:
                event.state = "failed"
                event.note = f"Max retries exhausted: {e}"
                self.stats.failed[event.topic] += 1
                self.stats.dlq_count += 1
                # Create DLQ event
                dlq_event = KafkaEvent(
                    topic="dlq",
                    key=event.key,
                    payload={
                        "original_event_id": event.id,
                        "original_topic": event.topic,
                        "error": str(e),
                        "attempts": event.attempts,
                    },
                    correlation_id=event.correlation_id,
                )
                self.events.append(dlq_event)
                self.stats.published["dlq"] += 1

    def subscribe(self, topic: str, group: str, handler: Callable) -> None:
        handler._consumer_group = group  # type: ignore
        self.consumers[topic].append(handler)

    def get_events(self, topic: str | None = None, limit: int = 100) -> list[dict]:
        events = self.events
        if topic:
            events = [e for e in events if e.topic == topic]
        return [e.to_dict() for e in events[-limit:]]

    def get_dlq_events(self) -> list[dict]:
        return self.get_events(topic="dlq")

    def health_check(self) -> dict:
        return {
            "status": "degraded",
            "backend": "in-memory",
            "note": "Kafka not connected; using in-memory event bus",
        }


class KafkaEventService:
    """
    Unified event service that uses real Kafka when configured and available,
    and falls back to an in-memory event bus for development/mock mode.
    """

    def __init__(self):
        self._kafka_configured = False
        self._bootstrap_servers = ""
        self._producer: KafkaProducer | None = None
        self._in_memory = InMemoryEventBus()
        self.stats = EventStats()
        self._events_log: list[KafkaEvent] = []
        self._init()

    def _init(self):
        """Check if Kafka is configured and try to connect."""
        kafka_url = getattr(settings, "kafka_bootstrap_servers", "")
        if not kafka_url:
            # Check environment variable directly
            import os
            kafka_url = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "")

        if kafka_url:
            self._bootstrap_servers = kafka_url
            self._kafka_configured = True
            self._producer = KafkaProducer(kafka_url)
            connected = self._producer.connect()
            if not connected:
                logger.warning("Kafka configured but broker unreachable, using in-memory fallback")
        else:
            logger.info("Kafka not configured, using in-memory event bus")

    def publish(self, topic: str, key: str, payload: dict[str, Any],
                correlation_id: str | None = None) -> KafkaEvent:
        """Publish an event to a topic."""
        event = KafkaEvent(
            topic=topic,
            key=key,
            payload=payload,
            correlation_id=correlation_id,
        )

        # Try real Kafka first
        if self._producer and self._producer.is_connected:
            event_data = event.to_dict()
            success = self._producer.send(topic, key, event_data)
            if success:
                event.state = "published"
                self.stats.published[topic] += 1
                self._events_log.append(event)
                if len(self._events_log) > 500:
                    self._events_log = self._events_log[-300:]
                return event

        # Fall back to in-memory
        self._in_memory.publish(event)
        self._events_log.append(event)
        if len(self._events_log) > 500:
            self._events_log = self._events_log[-300:]
        return event

    def get_events(self, topic: str | None = None, limit: int = 100) -> list[dict]:
        events = self._events_log
        if topic:
            events = [e for e in events if e.topic == topic]
        return [e.to_dict() for e in events[-limit:]]

    def get_stats(self) -> dict:
        if self._producer and self._producer.is_connected:
            return self.stats.to_dict()
        return self._in_memory.stats.to_dict()

    def get_dlq_events(self) -> list[dict]:
        return [
            e.to_dict() for e in self._events_log
            if e.topic == "dlq"
        ]

    def replay_event(self, event_id: str) -> KafkaEvent | None:
        """Replay an event by its ID (admin DLQ recovery)."""
        for event in self._events_log:
            if event.id == event_id:
                return self.publish(
                    event.topic if event.topic != "dlq" else event.payload.get("original_topic", "dlq"),
                    event.key,
                    event.payload,
                    correlation_id=event.correlation_id,
                )
        return None

    def health_check(self) -> dict:
        """Check Kafka broker health."""
        if not self._kafka_configured:
            return {
                "status": "not_configured",
                "backend": "none",
                "note": "KAFKA_BOOTSTRAP_SERVERS not set",
            }

        if self._producer and self._producer.is_connected:
            return {
                "status": "healthy",
                "backend": "kafka",
                "bootstrap_servers": self._bootstrap_servers,
            }

        # Try to reconnect
        if self._producer:
            connected = self._producer.connect()
            if connected:
                return {
                    "status": "healthy",
                    "backend": "kafka",
                    "bootstrap_servers": self._bootstrap_servers,
                }

        return {
            "status": "unhealthy",
            "backend": "kafka",
            "bootstrap_servers": self._bootstrap_servers,
            "note": "Broker unreachable; using in-memory fallback",
        }

    def close(self):
        if self._producer:
            self._producer.close()


# Singleton
_event_service: KafkaEventService | None = None


def get_event_service() -> KafkaEventService:
    """Get or create the event service singleton."""
    global _event_service
    if _event_service is None:
        _event_service = KafkaEventService()
    return _event_service


def reset_event_service() -> None:
    """Reset the event service singleton (for testing)."""
    global _event_service
    if _event_service:
        _event_service.close()
    _event_service = None
