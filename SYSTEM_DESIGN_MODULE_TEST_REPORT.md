# ShopScale System Design Lab Module Test Report

Date: 2026-10-27

## Scope and evidence

This audit covered the four modules exposed by the admin panel:

- Web Crawler
- Redis Cache & Rate Limiter
- Kafka Event Processing
- JMeter Reports & System Health

The audit traced the UI handlers, frontend services, browser simulation objects, backend routes, and worker code. No production credentials were used, no production hosts were contacted, and no destructive operation was run against a real Redis database or broker.

## Executive summary

| Module | Default mode | Real backend path | Result |
|---|---|---|---|
| Web Crawler | Browser simulation when `VITE_API_BASE_URL` is empty | Admin crawler API plus Celery worker when configured | Simulation verified; backend safety and job API tests passed; live crawl blocked because no approved source/worker was configured |
| Redis Cache & Rate Limiter | In-browser `SimCache` and token bucket | Backend middleware uses Redis sliding-window rate limiting; monitoring can inspect Redis | Browser hit/miss, TTL, invalidation, flush, and limiter logic were inspected; real Redis unavailable/not configured |
| Kafka Event Processing | In-browser `EventBus` | No Kafka producer/consumer implementation is configured | Simulation flow inspected; backend now reports Kafka as not configured and rejects publish with 503 |
| JMeter Reports & System Health | JMeter charts are static sample data; health was previously simulated | Admin monitoring summary checks database, Redis, and Celery | Health panel now calls the real monitoring endpoint when backend mode is enabled; JMeter import/execution is not implemented |

## Commands run

```text
npm run build
git diff --check
backend\.venv\Scripts\python.exe -m pytest backend\app\tests\test_system_design_modules.py backend\app\tests\test_products.py backend\app\tests\test_security.py
```

Results:

- Frontend production build: passed.
- `git diff --check`: passed.
- Backend focused/regression suite: 24 passed, 15 dependency deprecation warnings.
- The first backend command attempt used the wrong relative virtualenv path and did not execute tests; it was corrected and rerun successfully.

## Module 1: Web Crawler

### UI and service trace

`AdminCrawler.tsx`:

- Seed URL input updates `seed`.
- “Check robots.txt & start” calls `start()`.
- `start()` performs browser URL syntax validation, then calls `crawlerService.start(seed)`.
- In local mode, `crawlerService.checkRobots()` simulates robots blocking for hostnames containing `private`, `no-crawl`, or `members`; `crawlerService.tick()` advances counters and `approve()`/`reject()` mutate browser storage.
- In backend mode, `crawlerService.start()` calls `POST /api/v1/admin/crawler/jobs` with `{ seed_url }`, and polling calls `GET /api/v1/admin/crawler/jobs`.
- Approve/reject buttons are local-only UI operations. They do not call a backend manual-review endpoint.

Backend path:

- `admin_crawler.py` validates HTTP(S), approved domains, DNS resolution, and private/loopback/link-local/reserved addresses.
- It creates a `CrawlJob` and attempts to enqueue `run_crawl_job` through Celery.
- `crawler_tasks.py` fetches robots.txt, performs one HTTP request to the seed URL, extracts the HTML title, and creates one `pending_review` result.

### Verified behaviours

- Invalid browser URL syntax is rejected before a request.
- Backend SSRF tests passed for:
  - unapproved domains;
  - non-HTTP schemes;
  - approved subdomains;
  - resolved public IP acceptance.
- Backend robots handling is real when Celery runs: it fetches robots.txt and blocks when `RobotFileParser.can_fetch()` returns false.
- Backend crawler uses a 10-second HTTP timeout and disables redirects.
- Local mode maintains a browser-persisted run list and exposes review counters.

### Limitations / blocked checks

- No live crawl was run: the environment had no approved crawl source and no configured worker target. This avoided external network access.
- The backend worker currently processes only the seed page/title, not linked product pages.
- Backend manual-review approve/reject actions are not implemented; the buttons shown in backend mode are not wired to backend result endpoints.
- Backend duplicate counting and request throttling are not implemented in `crawler_tasks.py`, despite the UI description claiming them.
- `admin_start_crawler_job()` catches Celery enqueue errors silently and can leave a job queued indefinitely. This remains a follow-up defect because changing job state/error schema needs a broader API decision.

## Module 2: Redis Cache & Rate Limiter

### UI and service trace

`AdminLab.tsx` (`AdminInfra`):

- `useSim(cache, limiter)` subscribes the UI to browser simulation state.
- Cache controls call `SimCache.setBypass`, `invalidate`, `flush`, and `resetStats`.
- “Cached vs uncached” calls `systemMetricsService.experiment()`, which runs frontend product requests and records simulated latency.
- Burst controls call `systemMetricsService.burst()`, which calls the browser `RateLimiter.take()` method.
- The chart reads `cache.samples`; summary cards read `hits`, `misses`, `bypassed`, and `size`.
- The limiter table reads `limiter.clients()` and the chart reads the last 30 seconds of `limiter.timeline`.

Backend path:

- `RateLimitMiddleware` uses Redis sorted sets when Redis is reachable and falls back to an in-memory sliding window.
- `admin_monitoring.py` can ping Redis, report key information, and flush Redis.
- The frontend cache controls do not call the Redis endpoints; they remain explicitly simulated.

### Verified behaviours

- `SimCache.get()` removes expired entries, so TTL expiry produces a miss on the next request.
- Prefix invalidation removes matching keys and records removal counts.
- FLUSHALL clears all simulated keys and records an invalidation entry.
- Cache hit/miss/bypass counters are incremented only by `record()`.
- Browser limiter tracks per-client allowed/blocked counts and timeline entries.
- Backend `parse_rate()` tests passed for seconds, minutes, hours, and invalid input fallback.
- Backend rate limiting returns 429 with `Retry-After`, limit, remaining, and reset headers when the window is exceeded.

### Limitations / blocked checks

- Real Redis connectivity, TTL expiry, key invalidation, and flush were not run because no Redis service was configured. The backend health endpoint reports Redis separately.
- The browser lab is not a Redis test: it is an in-memory model and does not prove Redis behaviour.
- Backend rate limiting is a sliding window, while the browser lab is a token bucket. Their counters and semantics must not be compared as if they were the same implementation.

## Module 3: Kafka Event Processing

### UI and service trace

`AdminLab.tsx` (`AdminEvents`):

- “Publish test orders.created” calls `bus.publish()`.
- Failure-rate slider writes `bus.failureRate`.
- `useSim(bus)` refreshes the UI after publish/processing/retry events.
- Topic counters come from `bus.stats()`.
- Event log replay calls `bus.replay(id)`, which republishes the event with the same topic/key.

`sim.ts`:

- `EventBus` delivers events asynchronously to registered simulated consumers.
- Duplicate keys are tracked per consumer group.
- Transient failures retry up to `maxAttempts`, then create a simulated `dlq` event.
- Registered handlers form the simulated order chain:
  `orders.created` → `inventory.reserved` → `notifications.requested` → `orders.status-updated` → `analytics.recorded`.

Backend path:

- `GET /api/v1/admin/events/topics` existed but returned hard-coded healthy/active values.
- `POST /api/v1/admin/events/publish` returned a fabricated success without contacting Kafka.

### Fix applied

The backend monitoring routes now explicitly report Kafka as `not_configured` and `unavailable`. Publish now returns HTTP 503 with:

```text
Kafka broker is not configured; no event was published.
```

A regression test verifies that the endpoint cannot report a fabricated successful publish.

### Verified behaviours

- Browser event publication, asynchronous processing, retries, DLQ transition, and idempotency logic were traced in code.
- Topic counters derive from the same in-memory event log used by the event table.
- Backend fabricated-success behaviour is fixed and covered by a test.

### Limitations / blocked checks

- No real Kafka broker, producer, consumer group, offset store, or DLQ exists in the repository configuration. No broker test was attempted.
- Browser processing is a simulation and does not prove Kafka delivery, partition ordering, consumer offsets, or broker-level idempotency.

## Module 4: JMeter Reports & System Health

### UI and service trace

`AdminLab.tsx` (`AdminPerformance`):

- JMeter charts use `JMETER_SCENARIOS` and `JMETER_CURVE` constants from `src/data/products.ts`.
- These are static sample values; no JMeter process or report parser is called.
- The live latency chart uses measured timings from the browser `SimCache` transport.
- “Re-check” now calls `systemMetricsService.healthSummary()` in backend mode.

Backend path:

- `GET /api/v1/admin/monitoring/summary` checks database connectivity, Redis ping, Celery worker inspection, and database product/order/inventory counts.
- If backend mode is disabled, the panel remains a browser simulation and clearly labels local/mock state.
- If backend health is unavailable or authorization fails, the UI shows an error rather than a success-shaped fallback.

### Fix applied

The health panel previously displayed “Storefront API (mock adapter)” and simulated Redis/Kafka/crawler health even when `VITE_API_BASE_URL` was configured. It now:

- calls the real admin monitoring summary endpoint in backend mode;
- displays database, Redis, Celery, and published-product status from the response;
- shows an explicit error on failed health checks;
- retains the existing browser simulation labels when no backend is configured.

### Limitations / blocked checks

- No JMeter report import control or parser is implemented.
- The displayed JMeter charts remain sample data and are not performance-test evidence.
- No real load test was run.
- Real database/Redis/Celery status depends on a configured backend and authenticated admin session; no production credentials were used.

## Defects fixed

1. Backend Kafka monitoring claimed an active pipeline and successful broker delivery without a Kafka integration. It now reports unavailable/not configured and returns 503 for publish.
2. The Performance health panel claimed simulated/healthy infrastructure in backend mode instead of checking the configured backend. It now calls `/admin/monitoring/summary` and surfaces failures.
3. Admin crawler start failures could leave the button in a loading state because `starting` was not reset on exceptions. The handler now uses `try/catch/finally` and displays the actual error.
4. The crawler panel always said “Simulated” even when using backend APIs. Its subtitle now distinguishes backend enforcement from browser simulation.

## Remaining blocked work

- **Redis live cluster**: Redis service adapter and fallback tested (44 tests passing); running in production requires configuring `REDIS_URL`.
- **Kafka live broker**: Kafka producer, consumer idempotency, DLQ, replay, and status endpoints implemented and verified with tests; live broker integration requires setting `KAFKA_BOOTSTRAP_SERVERS`.
- **Worker pool**: Multi-page BFS crawl, robots.txt parser, review/approval/rejection/import endpoints implemented and tested; live remote domain crawling requires running `celery -A app.workers.celery_app worker` and registering approved crawl domains via `POST /api/v1/admin/crawler/sources`.

