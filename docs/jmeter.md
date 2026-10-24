# JMeter test plan — ShopScale

> The charts in **Admin → JMeter & Health** ship with SAMPLE data. Replace them with your own results.

## Thread groups (scenarios)
| # | Scenario | Endpoint(s) | Users / ramp | Purpose |
|---|----------|-------------|--------------|---------|
| 1 | Homepage | `GET /api/products/search` (bestsellers, newest) | 500 / 60s | Read-heavy, cacheable |
| 2 | Listing & search | `POST /api/products/search` (random filters, `q`) | 500 / 60s | Facets + search cost |
| 3 | Product detail | `GET /api/products/{slug}` | 500 / 60s | Hot-key caching |
| 4 | Add to cart | `POST /api/cart/items` | 500 / 60s | Write path |
| 5 | Order creation | `POST /api/orders` (Idempotency-Key header) | 500 / 60s | Kafka async vs sync |
| 6 | Rate-limit overload | `GET /api/products/search` from 1 IP | 2000 / 10s | Expect 429s, stable latency |
| 7 | Cache comparison | Scenario 2 with `X-Cache-Bypass: 1` vs normal | 500 / 60s | Cached vs uncached |

## Running
```bash
jmeter -n -t shopscale.jmx -Jhost=localhost -Jport=8080 -Jusers=500 -l results.jtl -e -o report/
```
Record: throughput, average, p95, p99, error %, concurrent users. Run each scenario twice —
**baseline** (cache disabled, synchronous order writes) and **optimised** (Redis cache-aside + Kafka).

## Importing results
Export the HTML dashboard's `statistics.json` and expose it from the backend at `GET /api/metrics/jmeter`;
replace `JMETER_SCENARIOS` in `src/data/products.ts` until that endpoint exists.
