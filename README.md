# ShopScale — World of Sarees
*A World Woven in Tradition* · Premium saree storefront + System Design Laboratory prototype.

## Quick start
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npx tsc --noEmit   # type-check
```
Admin console: `#/admin/login` — demo credentials **admin@shopscale.dev / admin123**.
Customer sign-in: `#/login` — any email + a 6+ character password (demo auth stored locally).

## What's inside
**Storefront** — Home, Shop All, Search, Regions, Fabrics, Techniques, Occasions, Collections (A–Z of 137 varieties),
Product detail (zoom, verified vs unverified attributes, Buy Now, short-link share), Wishlist, Cart, Checkout (mock adapter,
saved addresses, idempotency key), Order confirmation, live Order tracking, Heritage, Craft Stories, Contact & Support.

**Storefront (new)** — Compare Sarees (tray + table, max 3), Fabric & Weaving Guide (with weave diagrams),
verified demo reviews + write-a-review, back-in-stock alerts, gift wrap at checkout, customer testimonials,
EN/TA chrome toggle (beta), certification filter, login/register/forgot-password, full account area
(profile, address book, orders, returns).

**Admin (new)** — Login portal (`/admin/login`), Dashboard, Products table (search/filter/sort/pagination/bulk/CSV),
Add/Edit Saree form (5 sections, validation, image manager, storefront preview, draft→review→published→archived),
dedicated Inventory (thresholds, alerts), Content (announcement/hero/banners), Support (returns & refunds).

**System Design Lab** — Overview, Products & Varieties, Orders & Inventory (restock → cache invalidation),
URL shortener, Web crawler (robots.txt, throttling, dedupe, manual review), Redis cache & rate limiter (live, configurable,
bursts, cached-vs-uncached experiment), Kafka events (topics, lag, retries, DLQ, idempotent replay), JMeter & system health.

## Architecture
```
src/
  types/            domain model (Variety, Product, FilterKey, Order…)
  data/catalogue.ts variety catalogue (parsed from compact text), regions, fabrics, techniques, occasions, store policy
  data/products.ts  demo products built from catalogue + seed specs
  data/navigation.ts mega-menu generated from catalogue
  services/         typed API layer (product, cart, wishlist, auth, order, search, shortLink, crawler, systemMetrics)
  services/filters.ts faceted filter engine + spelling-tolerant search
  services/catalog.ts catalogue CMS, reviews, alerts, returns, addresses, compare, content, audit (local-first)
  lib/sim.ts        in-browser simulations: SimCache (Redis), RateLimiter (token bucket), EventBus (Kafka)
  components/       layout, ui, products, cart
  pages/, pages/admin/
```
Every service checks `VITE_API_BASE_URL`; if set it calls the backend, otherwise it uses the mock transport
(rate limiter → cache-aside → simulated DB latency). UI components never call `fetch` directly.

### Official handloom-sector compilation
The variety catalogue covers all 116 listed rows of the Government's *Pan-India Sarees of Handloom Sectors*
compilation (North · East · West · South zones) — every row resolves to a variety, tagged with its
compilation zone on the Collections page. Official spellings are kept as aliases (e.g. *Karvath Kati*,
*Lugda*, *Gollabamma*), and the source table's own quirks (Pitambari listed twice, Himroo under South)
are preserved as published.

### Model imagery
Model portraits are licensed stock photography (Pexels) chosen for a graceful, traditional look.
No celebrity or real person is depicted or endorsed; images are representative styling, not proof of a
specific weave or origin.

### Adding a saree variety
Add one line under the right state in `RAW` in `src/data/catalogue.ts`:
`Name | fabrics | techniques | occasions | blurb | flags(inspired · ensemble · drape · aka:Alias)`.
Filters, navigation, collections and region pages pick it up automatically.

## Recommended backend (to implement)
Node.js + TypeScript (Fastify/Express) · PostgreSQL · Redis · Kafka · JMeter.

| Method | Endpoint | Notes |
|--------|----------|-------|
| POST | `/products/search` | body = `ProductQuery`; returns `Paged<Product>` with facets. Redis cache-aside keyed by normalised query |
| GET | `/products/:slug` | cached `product:{slug}`; invalidated on update |
| POST | `/orders` | `Idempotency-Key` header; publishes `orders.created` |
| GET | `/orders/:ref?email=` | order + status events |
| POST | `/shorten` · GET `/s/:code` | 302 redirect, click + referrer counters |
| POST | `/crawler/jobs` · GET `/crawler/runs` | respects robots.txt, per-host rate limit, review queue |
| GET | `/metrics/cache` · `/metrics/rate-limit` · `/metrics/events` · `/metrics/jmeter` | admin only |
| POST | `/auth/login` · `/auth/register` · `/newsletter` · `/support/tickets` | |

All endpoints are rate limited (token bucket per IP/user) and return `429` with `Retry-After`; the UI shows a
countdown and never auto-retries aggressively. Broker/DB credentials live only in backend env vars.

## Honesty rules baked into the UI
- Demo prices, stock, ratings and discounts are labelled as demo data; checkout never takes payment or card data.
- Composition is explicit (Pure / Blend / Natural Fibre / Art Silk–Synthetic); art silk is never called pure silk.
- Origin shows "not yet verified" unless a record says otherwise; images are labelled representative.
- "Inspired" varieties are marked as contemporary adaptations; Mekhela Chador is an ensemble; Southeast Asian garments
  are "Related Draping Traditions — not sarees".
- Infrastructure metrics are labelled *Simulated in browser* or *Sample data* until a backend supplies real values.

## JMeter
See [`docs/jmeter.md`](docs/jmeter.md).

## Routes
| Portal | Route | Notes |
|--------|-------|-------|
| Storefront | `/`, `/shop`, `/search` | catalogue + faceted search (filters persist in URL) |
| | `/regions`, `/fabrics`, `/techniques`, `/occasions`, `/collections` | browse dimensions |
| | `/guide` | fabric & weaving guide |
| | `/product/:slug` | gallery, zoom, reviews, compare, stock alerts |
| | `/compare` | side-by-side table, max 3 |
| | `/login`, `/register`, `/forgot-password` | customer auth (demo) |
| | `/account` | profile, addresses, orders, returns |
| | `/cart`, `/checkout`, `/order-confirmation/:ref`, `/track` | mock checkout, live tracking |
| | `/heritage`, `/stories`, `/contact` | content & support |
| Admin | `/admin/login` | admin-only portal (demo seed below) |
| | `/admin/dashboard` | sample metrics, quick actions, audit |
| | `/admin/products`, `/new`, `/:id/edit` | full CRUD + CSV + preview |
| | `/admin/inventory`, `/admin/orders` | stock, thresholds, order table |
| | `/admin/content`, `/admin/support` | banners/copy, returns & refunds |
| | `/admin/catalogue`, `/links`, `/crawler`, `/infra`, `/events`, `/performance` | catalogue regions, systems lab |

## Roles & access (demo)
- `customer` — shop, wishlist, orders, addresses, returns. Registration can never grant admin.
- `admin` — seeded demo account only (`admin@shopscale.dev` / `admin123`), stored as a local flag.
- Frontend guards are UX-only. A production backend must verify roles server-side on every protected API.

## Admin product workflow (demo, local)
1. `/admin/login` → dashboard → **Add Saree**.
2. Fill the 5 sections (validation blocks bad saves; publishing also requires the full pass).
3. Add images via catalogue samples or URL; reorder; first image is primary.
4. **Preview** renders the storefront card; **Save Draft** keeps it hidden; **Publish** makes it instantly visible in shop/search/collections with cache invalidation.
5. Unpublish/archive hides it again; delete asks for typed confirmation.
6. Seed-product edits, stock, thresholds and deletes persist across reloads via local overlays + tombstones.
7. Every mutation writes to the audit trail (Dashboard + Products pages).

## CSV import format
Header (optional): `sku,name,variety,price,originalPrice,stock,publication,fabric,loom,state`.
Rows are validated per-row (unknown variety, bad price/stock reported with row numbers); accepted rows arrive as **drafts** with a placeholder image — complete them before publishing. Export downloads the current catalogue.

## Feature status
| Area | Status |
|------|--------|
| Storefront shopping, filters, search, sort, pagination | ✅ Working (mock data) |
| Wishlist, cart, checkout, tracking, returns, reviews, alerts, gifts, compare | ✅ Working (local demo) |
| Login/register/forgot, account area | ✅ Working (demo auth, no real security) |
| Admin CRUD, publishing workflow, CSV, inventory, content, support | ✅ Working (local demo) |
| EN/TA toggle (nav, hero, footer chrome) | ✅ Beta — catalogue content stays in source language |
| Redis / rate limiter / Kafka / crawler / JMeter dashboards | ✅ Simulated in-browser, labelled as such |
| Real backend, DB, payments, email, image storage | ❌ Requires external configuration (see API table above) |

# popps
