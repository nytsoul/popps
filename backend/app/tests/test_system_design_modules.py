"""Regression tests for system-design safety and unavailable integrations."""
from __future__ import annotations

from app.api.v1.routers.admin_crawler import _ssrf_validate
from app.core.rate_limit import parse_rate


def test_rate_limit_parser_supports_common_units():
    assert parse_rate("10/second") == (10, 1)
    assert parse_rate("100/minute") == (100, 60)
    assert parse_rate("2/hour") == (2, 3600)


def test_rate_limit_parser_has_safe_default_for_invalid_values():
    assert parse_rate("not-a-rate") == (500, 60)


def test_crawler_rejects_unapproved_domain():
    allowed, reason = _ssrf_validate("https://outside.example/catalog", ["partner.example"])
    assert not allowed
    assert "not in the approved" in reason


def test_crawler_rejects_non_http_scheme():
    allowed, reason = _ssrf_validate("file:///etc/hosts", ["partner.example"])
    assert not allowed
    assert "not permitted" in reason


def test_crawler_accepts_subdomain_of_approved_domain(monkeypatch):
    monkeypatch.setattr(
        "app.api.v1.routers.admin_crawler.socket.getaddrinfo",
        lambda *_args, **_kwargs: [(None, None, None, None, ("93.184.216.34", 0))],
    )
    allowed, reason = _ssrf_validate("https://catalog.partner.example/items", ["partner.example"])
    assert allowed
    assert reason == "ok"


def test_kafka_publish_is_not_reported_as_success_when_unconfigured(client, admin_token):
    response = client.post(
        "/api/v1/admin/events/publish",
        headers=admin_token,
        json={"topic": "orders.created", "key": "test-key", "data": {}},
    )
    assert response.status_code == 503
    assert "not configured" in response.json()["detail"]


# ── Redis Cache Service Tests ──────────────────────────────────────────────

def test_redis_cache_service_set_get_and_stats():
    from app.integrations.redis_cache import get_cache_service, reset_cache_service
    reset_cache_service()
    cache = get_cache_service()

    # Miss
    val = cache.get("test-key-not-found")
    assert val is None
    stats = cache.get_stats()
    assert stats["misses"] >= 1

    # Set and Hit
    cache.set("test-key-1", {"name": "Banarasi Katan Silk"}, ttl=60)
    val = cache.get("test-key-1")
    assert val is not None
    assert val["name"] == "Banarasi Katan Silk"

    stats = cache.get_stats()
    assert stats["hits"] >= 1
    assert stats["hit_rate"] > 0


def test_redis_cache_service_ttl_expiry():
    from app.integrations.redis_cache import get_cache_service, reset_cache_service
    import time
    reset_cache_service()
    cache = get_cache_service()

    cache.set("short-lived", "temp-val", ttl=1)
    assert cache.get("short-lived") == "temp-val"

    time.sleep(1.1)
    assert cache.get("short-lived") is None


def test_redis_cache_service_delete_pattern_and_flush():
    from app.integrations.redis_cache import get_cache_service, reset_cache_service
    reset_cache_service()
    cache = get_cache_service()

    cache.set("product:101", "p1")
    cache.set("product:102", "p2")
    cache.set("order:201", "o1")

    # Invalidate pattern
    removed = cache.delete_pattern("product:*")
    assert removed == 2
    assert cache.get("product:101") is None
    assert cache.get("order:201") == "o1"

    # Flush
    cache.flush_namespace()
    assert cache.get("order:201") is None


def test_admin_infra_redis_endpoints(client, admin_token):
    # Status
    res = client.get("/api/v1/admin/infra/redis", headers=admin_token)
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert "stats" in data

    # Cache stats
    res = client.get("/api/v1/admin/infra/cache/stats", headers=admin_token)
    assert res.status_code == 200
    assert "hits" in res.json()

    # Flush
    res = client.post("/api/v1/admin/infra/redis/flush", headers=admin_token)
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


# ── Kafka Event Service Tests ──────────────────────────────────────────────

def test_kafka_event_bus_delivery_and_idempotency():
    from app.integrations.kafka_events import InMemoryEventBus, KafkaEvent

    bus = InMemoryEventBus()
    processed_calls = []

    def handle_order(event: KafkaEvent):
        processed_calls.append(event.key)

    handle_order._consumer_group = "order-processor"
    bus.consumers["orders.created"].append(handle_order)

    # First event
    ev1 = KafkaEvent(topic="orders.created", key="ORD-100", payload={"ref": "ORD-100"})
    bus.publish(ev1)
    assert len(processed_calls) == 1
    assert ev1.state == "processed"

    # Duplicate key to same consumer group -> should be skipped for idempotency
    ev2 = KafkaEvent(topic="orders.created", key="ORD-100", payload={"ref": "ORD-100"})
    bus.publish(ev2)
    assert len(processed_calls) == 1  # Not processed again
    assert ev2.state == "duplicate"


def test_kafka_event_retry_and_dlq():
    from app.integrations.kafka_events import InMemoryEventBus, KafkaEvent

    bus = InMemoryEventBus()

    def failing_handler(event: KafkaEvent):
        raise RuntimeError("Payment gateway timeout")

    failing_handler._consumer_group = "payment-worker"
    bus.consumers["orders.created"].append(failing_handler)

    ev = KafkaEvent(topic="orders.created", key="ORD-FAIL-1", payload={"ref": "ORD-FAIL-1"})
    bus.publish(ev)

    assert ev.state == "failed"
    assert ev.attempts == 3  # MAX_RETRIES
    assert bus.stats.dlq_count >= 1
    assert bus.stats.failed["orders.created"] >= 1


def test_kafka_admin_topics_and_dlq_endpoints(client, admin_token):
    res = client.get("/api/v1/admin/events/topics", headers=admin_token)
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert "topics" in data

    res = client.get("/api/v1/admin/events/dlq", headers=admin_token)
    assert res.status_code == 200
    assert "dlq_events" in res.json()


# ── JMeter Parser & Upload Tests ───────────────────────────────────────────

SAMPLE_JTL_CONTENT = (
    "timeStamp,elapsed,label,responseCode,responseMessage,threadName,dataType,success,failureMessage,bytes,sentBytes,grpThreads,allThreads,URL,Latency,IdleTime,Connect\n"
    "1700000000000,120,GET /api/v1/products,200,OK,Thread Group 1-1,text,true,,2048,150,1,1,http://localhost:8000/api/v1/products,110,0,10\n"
    "1700000001000,240,GET /api/v1/products,200,OK,Thread Group 1-1,text,true,,2048,150,1,1,http://localhost:8000/api/v1/products,220,0,15\n"
    "1700000002000,500,POST /api/v1/orders,500,Internal Error,Thread Group 1-2,text,false,Server error,512,300,1,1,http://localhost:8000/api/v1/orders,490,0,20\n"
    "1700000003000,80,GET /api/v1/products/1,200,OK,Thread Group 1-1,text,true,,1024,120,1,1,http://localhost:8000/api/v1/products/1,75,0,5\n"
)


def test_jmeter_parser_valid_csv():
    from app.integrations.jmeter_parser import compute_metrics, parse_jtl_csv, validate_jtl_content

    valid, reason = validate_jtl_content(SAMPLE_JTL_CONTENT)
    assert valid

    samples = parse_jtl_csv(SAMPLE_JTL_CONTENT)
    assert len(samples) == 4

    metrics = compute_metrics(samples)
    assert metrics.sample_count == 4
    assert metrics.successful_count == 3
    assert metrics.failed_count == 1
    assert metrics.error_percentage == 25.0
    assert metrics.min_response_time == 80.0
    assert metrics.max_response_time == 500.0
    assert metrics.response_code_distribution.get("200") == 3
    assert metrics.response_code_distribution.get("500") == 1


def test_jmeter_parser_invalid_content():
    from app.integrations.jmeter_parser import validate_jtl_content

    valid, reason = validate_jtl_content("not,a,jmeter,header\n1,2,3,4")
    assert not valid
    assert "missing required headers" in reason


def test_jmeter_admin_endpoints(client, admin_token):
    import io

    # Upload valid report
    file_data = io.BytesIO(SAMPLE_JTL_CONTENT.encode("utf-8"))
    res = client.post(
        "/api/v1/admin/monitoring/jmeter/upload",
        headers=admin_token,
        files={"file": ("test_run.jtl", file_data, "text/plain")},
    )
    assert res.status_code == 200
    report_id = res.json()["id"]
    assert res.json()["sample_count"] == 4

    # List reports
    res = client.get("/api/v1/admin/monitoring/jmeter/reports", headers=admin_token)
    assert res.status_code == 200
    reports = res.json()["reports"]
    assert len(reports) >= 1

    # Get specific report
    res = client.get(f"/api/v1/admin/monitoring/jmeter/reports/{report_id}", headers=admin_token)
    assert res.status_code == 200
    assert res.json()["id"] == report_id


# ── Crawler Review & Import Workflow Tests ─────────────────────────────────

def test_crawler_review_and_import_workflow(client, admin_token, db):
    import uuid
    from app.models.crawler import CrawlJob, CrawlResult
    from app.models.product import Product

    # Create dummy crawl job
    job = CrawlJob(
        seed_url="https://partner.example/catalog",
        status="completed",
        pending_review_count=2,
        imported_count=0,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Add 2 crawl results
    r1 = CrawlResult(
        job_id=job.id,
        source_url="https://partner.example/catalog/item-1",
        title="Royal Paithani Silk Saree",
        description="Rich zari border with peacock motifs",
        price_raw="₹32,000",
        image_url="https://partner.example/images/item-1.jpg",
        status="pending_review",
    )
    r2 = CrawlResult(
        job_id=job.id,
        source_url="https://partner.example/catalog/item-2",
        title="Chanderi Handloom Saree",
        description="Pure cotton silk blend",
        price_raw="₹8,500",
        image_url="https://partner.example/images/item-2.jpg",
        status="pending_review",
    )
    db.add_all([r1, r2])
    db.commit()

    # 1. List results
    res = client.get(f"/api/v1/admin/crawler/jobs/{job.id}/results", headers=admin_token)
    assert res.status_code == 200
    results = res.json()
    assert len(results) == 2

    # 2. Approve 1 result
    res = client.post(
        f"/api/v1/admin/crawler/jobs/{job.id}/approve?count=1",
        headers=admin_token,
    )
    assert res.status_code == 200
    assert res.json()["approved_count"] == 1

    # 3. Import approved result into product catalogue
    res = client.post(
        f"/api/v1/admin/crawler/results/{r1.id}/import",
        headers=admin_token,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "imported"
    product_id = data["product_id"]

    # Verify product was created in draft status
    imported_product = db.query(Product).filter(Product.id == uuid.UUID(product_id)).first()
    assert imported_product is not None
    assert imported_product.publication == "draft"
    assert imported_product.name == "Royal Paithani Silk Saree"
    assert imported_product.price_paise == 3200000

    # 4. Reject remaining results
    res = client.post(
        f"/api/v1/admin/crawler/jobs/{job.id}/reject",
        headers=admin_token,
    )
    assert res.status_code == 200
    assert res.json()["status"] == "rejected"

