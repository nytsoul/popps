import { PRODUCTS, INVENTORY_KEY } from "../data/products";
import { VARIETIES } from "../data/catalogue";
import { bus, cache, limiter, sleep } from "../lib/sim";
import type { CartItem, CrawlRun, Order, OrderStatus, Paged, Product, ProductQuery, ShortLink, User } from "../types";
import { ApiError, BACKEND_CONFIGURED, readStorage, request, writeStorage } from "./api";
import { didYouMean, matchesQuery, runQuery } from "./filters";

/* ===========================================================================
   Mock transport — mirrors the real backend's behaviour:
   rate limiter → cache-aside lookup → "database" latency → cache fill.
=========================================================================== */

interface CallOpts { cacheKey?: string; client?: string; dbMs?: [number, number] }

async function mockCall<T>(compute: () => T, { cacheKey, client = "storefront", dbMs = [180, 380] }: CallOpts = {}): Promise<{ data: T; cache: "HIT" | "MISS" | "BYPASS"; ms: number }> {
  const wait = limiter.take(client);
  if (wait > 0) {
    throw new ApiError({
      status: 429,
      message: `Too many requests — our rate limiter paused this action. Please wait about ${wait}s before trying again.`,
      retryAfter: wait,
    });
  }
  const start = performance.now();
  if (cacheKey && !cache.bypass) {
    const hit = cache.get<T>(cacheKey);
    if (hit !== undefined) {
      await sleep(12 + Math.random() * 25);
      const ms = Math.round(performance.now() - start);
      cache.record({ at: Date.now(), key: cacheKey, ms, result: "HIT" });
      return { data: hit, cache: "HIT", ms };
    }
  }
  await sleep(dbMs[0] + Math.random() * (dbMs[1] - dbMs[0]));
  const data = compute();
  const ms = Math.round(performance.now() - start);
  if (cacheKey) {
    if (cache.bypass) cache.record({ at: Date.now(), key: cacheKey, ms, result: "BYPASS" });
    else { cache.set(cacheKey, data); cache.record({ at: Date.now(), key: cacheKey, ms, result: "MISS" }); }
  }
  return { data, cache: cacheKey ? (cache.bypass ? "BYPASS" : "MISS") : "BYPASS", ms };
}

/* -------------------------------- products -------------------------------- */

const stableKey = (q: ProductQuery) => JSON.stringify(q, Object.keys(q).sort());

export const productService = {
  async list(q: ProductQuery = {}, client?: string): Promise<Paged<Product>> {
    if (BACKEND_CONFIGURED) return request(`/products/search`, { method: "POST", body: JSON.stringify(q) });
    const res = await mockCall(() => runQuery(PRODUCTS, q), { cacheKey: `list:${stableKey(q)}`, client });
    return { ...res.data, meta: { cache: res.cache, ms: res.ms } };
  },
  async bySlug(slug: string): Promise<Product> {
    if (BACKEND_CONFIGURED) return request(`/products/${slug}`);
    const res = await mockCall(() => PRODUCTS.find((x) => x.slug === slug), { cacheKey: `product:${slug}`, dbMs: [140, 260] });
    if (!res.data) throw new ApiError({ status: 404, message: "This saree could not be found. It may have been removed from the catalogue." });
    return res.data;
  },
  async related(p: Product): Promise<Product[]> {
    const res = await mockCall(() => {
      const scored = PRODUCTS.filter((x) => x.id !== p.id).map((x) => ({
        x, s: (x.variety === p.variety ? 4 : 0) + (x.state === p.state ? 2 : 0) + (x.fabric === p.fabric ? 1.5 : 0) + x.occasion.filter((o) => p.occasion.includes(o)).length * 0.5,
      }));
      return scored.sort((a, b) => b.s - a.s).slice(0, 4).map((s) => s.x);
    }, { cacheKey: `related:${p.id}`, dbMs: [100, 200] });
    return res.data;
  },
  all: () => PRODUCTS,
  /** Admin update → persists stock and invalidates dependent cache keys. */
  updateStock(id: string, stock: number) {
    const p = PRODUCTS.find((x) => x.id === id);
    if (!p) return 0;
    p.stock = Math.max(0, Math.round(stock));
    const overrides = readStorage<Record<string, number>>(INVENTORY_KEY, {});
    overrides[id] = p.stock;
    writeStorage(INVENTORY_KEY, overrides);
    return cache.invalidate(`product:${p.slug}`, "list:", `related:`);
  },
  countFor: (pred: (p: Product) => boolean) => PRODUCTS.filter(pred).length,
};

/* ------------------------------ cart/wishlist ------------------------------ */

const CART_KEY = "shopscale.cart.v2";
export const cartService = {
  load: (): CartItem[] => readStorage<CartItem[]>(CART_KEY, []).filter((i) => PRODUCTS.some((p) => p.id === i.productId)),
  save: (items: CartItem[]) => writeStorage(CART_KEY, items),
};

const WISHLIST_KEY = "shopscale.wishlist.v2";
export const wishlistService = {
  load: (): string[] => readStorage<string[]>(WISHLIST_KEY, []).filter((id) => PRODUCTS.some((p) => p.id === id)),
  save: (ids: string[]) => writeStorage(WISHLIST_KEY, ids),
};

/* ---------------------------------- auth ---------------------------------- */

const USER_KEY = "shopscale.user.v1";
const ADMIN_KEY = "shopscale.admin.v1";
export const DEMO_ADMIN = { email: "admin@shopscale.dev", password: "admin123" };

export const authService = {
  current: (): User | null => readStorage<User | null>(USER_KEY, null),
  async signIn(email: string, password: string): Promise<User> {
    if (BACKEND_CONFIGURED) return request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    await mockCall(() => null, { dbMs: [400, 600] });
    if (password.length < 6) throw new ApiError({ status: 401, message: "Invalid credentials. Password must be at least 6 characters." });
    const user: User = { id: "u-demo", name: email.split("@")[0].replace(/^\w/, (c) => c.toUpperCase()), email, role: "customer" };
    writeStorage(USER_KEY, user);
    return user;
  },
  async register(name: string, email: string, password: string): Promise<User> {
    if (BACKEND_CONFIGURED) return request("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) });
    await mockCall(() => null, { dbMs: [400, 600] });
    if (password.length < 6) throw new ApiError({ status: 400, message: "Password must be at least 6 characters." });
    const user: User = { id: "u-demo", name, email, role: "customer" };
    writeStorage(USER_KEY, user);
    return user;
  },
  /** Demo forgot-password: any well-formed email "receives" a reset link (no email is sent). */
  async forgotPassword(email: string): Promise<{ ok: true }> {
    if (BACKEND_CONFIGURED) return request("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
    await mockCall(() => null, { dbMs: [500, 800] });
    return { ok: true };
  },
  signOut() { localStorage.removeItem(USER_KEY); },
  isAdmin: () => readStorage<boolean>(ADMIN_KEY, false),
  async adminSignIn(email: string, password: string) {
    await sleep(500);
    if (email.trim().toLowerCase() !== DEMO_ADMIN.email || password !== DEMO_ADMIN.password) {
      throw new ApiError({ status: 401, message: "Invalid admin credentials." });
    }
    writeStorage(ADMIN_KEY, true);
  },
  adminSignOut() { localStorage.removeItem(ADMIN_KEY); },
};

/* ---------------------------------- orders --------------------------------- */

const ORDERS_KEY = "shopscale.orders.v2";
const readOrders = () => readStorage<Order[]>(ORDERS_KEY, []);
const writeOrders = (o: Order[]) => writeStorage(ORDERS_KEY, o);

function setOrderStatus(reference: string, status: OrderStatus, note: string) {
  const orders = readOrders();
  const o = orders.find((x) => x.reference === reference);
  if (!o) return;
  const rank: OrderStatus[] = ["placed", "confirmed", "processing", "packed", "shipped", "delivered"];
  if (rank.indexOf(status) <= rank.indexOf(o.status)) return; // monotonic transitions
  o.status = status;
  o.events.push({ status, at: new Date().toISOString(), note });
  writeOrders(orders);
  window.dispatchEvent(new CustomEvent("shopscale:order", { detail: reference }));
  bus.publish("analytics.recorded", `${reference}:${status}`, { reference, status });
}

/* Consumers — idempotent by key. In production these are separate services. */
type OrderPayload = { reference: string; items: { productId: string; quantity: number }[] };

bus.subscribe_("orders.created", "inventory-svc", (e) => {
  const { reference, items } = e.payload as OrderPayload;
  const overrides = readStorage<Record<string, number>>(INVENTORY_KEY, {});
  for (const it of items) {
    const p = PRODUCTS.find((x) => x.id === it.productId);
    if (!p) continue;
    p.stock = Math.max(0, p.stock - it.quantity);
    overrides[p.id] = p.stock;
    cache.invalidate(`product:${p.slug}`);
  }
  writeStorage(INVENTORY_KEY, overrides);
  cache.invalidate("list:");
  setOrderStatus(reference, "confirmed", "inventory.reserved — stock held for this order");
  bus.publish("inventory.reserved", reference, { reference });
});

bus.subscribe_("inventory.reserved", "notification-svc", (e) => {
  const { reference } = e.payload as { reference: string };
  setOrderStatus(reference, "processing", "notifications.requested — confirmation email queued (simulated)");
  bus.publish("notifications.requested", reference, { reference, channel: "email" });
});

bus.subscribe_("notifications.requested", "fulfilment-sim", (e) => {
  const { reference } = e.payload as { reference: string };
  setTimeout(() => bus.publish("orders.status-updated", `${reference}:packed`, { reference, status: "packed" }), 6000);
  setTimeout(() => bus.publish("orders.status-updated", `${reference}:shipped`, { reference, status: "shipped" }), 14000);
});

bus.subscribe_("orders.status-updated", "order-svc", (e) => {
  const { reference, status } = e.payload as { reference: string; status: OrderStatus };
  setOrderStatus(reference, status, status === "packed" ? "Packed at studio (simulated)" : "Handed to courier (simulated)");
});

bus.subscribe_("analytics.recorded", "analytics-svc", () => undefined);
bus.subscribe_("dlq", "ops-alerts", () => undefined);

export const orderService = {
  history: (): Order[] => readOrders(),
  byReference(ref: string): Order | undefined {
    return this.history().find((o) => o.reference.toLowerCase() === ref.trim().toLowerCase());
  },
  async track(ref: string, email: string): Promise<Order> {
    if (BACKEND_CONFIGURED) return request(`/orders/${encodeURIComponent(ref)}?email=${encodeURIComponent(email)}`);
    await mockCall(() => null, { dbMs: [200, 400] });
    const o = this.byReference(ref);
    if (!o || o.email.toLowerCase() !== email.trim().toLowerCase()) {
      throw new ApiError({ status: 404, message: "We couldn't find an order with that reference and email." });
    }
    return o;
  },
  async place(order: Omit<Order, "id" | "reference" | "status" | "createdAt" | "mock" | "events">, idempotencyKey: string): Promise<Order> {
    if (BACKEND_CONFIGURED) {
      const placed = await request<Order>("/orders", { method: "POST", headers: { "Idempotency-Key": idempotencyKey }, body: JSON.stringify(order) });
      const current = readOrders().filter((o) => o.id !== placed.id && o.reference !== placed.reference);
      writeOrders([placed, ...current]);
      return placed;
    }
    await mockCall(() => null, { dbMs: [700, 1100] });
    const existing = readOrders().find((o) => o.id === idempotencyKey);
    if (existing) return existing; // idempotent re-submit
    const now = new Date().toISOString();
    const placed: Order = {
      ...order,
      id: idempotencyKey,
      reference: `SS-2026-${String(Math.floor(10000 + Math.random() * 89999))}`,
      status: "placed",
      createdAt: now,
      mock: false,
      events: [{ status: "placed", at: now, note: "Order placed successfully" }],
    };
    writeOrders([placed, ...readOrders()]);
    bus.publish("orders.created", placed.reference, { reference: placed.reference, items: placed.items.map((i) => ({ productId: i.productId, quantity: i.quantity })) });
    return placed;
  },
};

/* ---------------------------------- search --------------------------------- */

const RECENT_KEY = "shopscale.recent-search.v1";

export interface Suggestions { products: Product[]; terms: { label: string; to: string; hint: string }[]; didYouMean?: string }

export const searchService = {
  suggest(term: string): Suggestions {
    const t = term.trim();
    if (!t) return { products: [], terms: [] };
    const key = `suggest:${t.toLowerCase()}`;
    const cached = cache.bypass ? undefined : cache.get<Suggestions>(key);
    if (cached) { cache.record({ at: Date.now(), key, ms: 1, result: "HIT" }); return cached; }
    const lower = t.toLowerCase();
    const terms = [
      ...VARIETIES.filter((v) => [v.name, ...v.aliases].some((n) => n.toLowerCase().includes(lower))).slice(0, 4)
        .map((v) => ({ label: v.name, to: `/shop?variety=${encodeURIComponent(v.name)}`, hint: `${v.state}${v.kind !== "Saree" ? ` · ${v.kind}` : ""}` })),
      ...[...new Set(VARIETIES.map((v) => v.state))].filter((s) => s.toLowerCase().includes(lower)).slice(0, 2)
        .map((s) => ({ label: s, to: `/shop?state=${encodeURIComponent(s)}`, hint: "Region" })),
    ];
    const products = PRODUCTS.filter((p) => matchesQuery(p, t)).slice(0, 5);
    const result: Suggestions = { products, terms, didYouMean: !products.length && !terms.length ? didYouMean(t) : undefined };
    if (!cache.bypass) cache.set(key, result);
    cache.record({ at: Date.now(), key, ms: 3, result: cache.bypass ? "BYPASS" : "MISS" });
    return result;
  },
  recent: (): string[] => readStorage<string[]>(RECENT_KEY, []),
  remember(term: string) {
    const t = term.trim();
    if (!t) return;
    writeStorage(RECENT_KEY, [t, ...this.recent().filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 6));
  },
  clearRecent() { writeStorage(RECENT_KEY, []); },
};

/* ------------------------------ recently viewed ---------------------------- */

const VIEWED_KEY = "shopscale.viewed.v2";
export const viewedService = {
  load: (): string[] => readStorage<string[]>(VIEWED_KEY, []),
  push(slug: string) { writeStorage(VIEWED_KEY, [slug, ...this.load().filter((s) => s !== slug)].slice(0, 8)); },
};

/* ------------------------------- short links ------------------------------- */

const LINKS_KEY = "shopscale.shortlinks.v2";
const SEED_LINKS: ShortLink[] = [
  { code: "kanji1", target: "/product/temple-peacock-kanjivaram", label: "Temple Peacock Kanjivaram", clicks: 148, referrers: { instagram: 92, whatsapp: 41, direct: 15 }, createdAt: "2026-02-01T09:00:00Z" },
  { code: "bengal", target: "/shop?state=West%20Bengal", label: "Bengal's Fine Weaves", clicks: 96, referrers: { newsletter: 60, direct: 36 }, createdAt: "2026-01-28T09:00:00Z" },
  { code: "ikat26", target: "/shop?weave=Ikat", label: "Ikat collection", clicks: 61, referrers: { pinterest: 40, direct: 21 }, createdAt: "2026-01-20T09:00:00Z" },
];

export const shortLinkService = {
  all: (): ShortLink[] => readStorage<ShortLink[]>(LINKS_KEY, SEED_LINKS),
  save: (links: ShortLink[]) => writeStorage(LINKS_KEY, links),
  async create(target: string, label: string): Promise<ShortLink> {
    if (BACKEND_CONFIGURED) return request("/shorten", { method: "POST", body: JSON.stringify({ url: target, label }) });
    await mockCall(() => null, { dbMs: [250, 450] });
    const existing = this.all().find((l) => l.target === target);
    if (existing) return existing; // dedupe identical targets
    const link: ShortLink = { code: Math.random().toString(36).slice(2, 8), target, label, clicks: 0, referrers: {}, createdAt: new Date().toISOString() };
    this.save([link, ...this.all()]);
    return link;
  },
  resolve(code: string): ShortLink | undefined {
    const links = this.all();
    const link = links.find((l) => l.code === code);
    if (!link) return undefined;
    link.clicks++;
    let ref = "direct";
    try { if (document.referrer) ref = new URL(document.referrer).hostname || "direct"; } catch { /* noop */ }
    link.referrers[ref] = (link.referrers[ref] ?? 0) + 1;
    this.save(links);
    return link;
  },
  remove(code: string) { this.save(this.all().filter((l) => l.code !== code)); },
  url: (code: string) => `${window.location.origin}${window.location.pathname}#/s/${code}`,
};

/* ----------------------------- newsletter/contact --------------------------- */

export const newsletterService = {
  async subscribe(email: string): Promise<{ ok: true }> {
    if (BACKEND_CONFIGURED) return request("/newsletter", { method: "POST", body: JSON.stringify({ email }) });
    await mockCall(() => null, { dbMs: [500, 800] });
    return { ok: true };
  },
};

export const contactService = {
  async submit(form: { name: string; email: string; topic: string; message: string; orderRef?: string }) {
    if (BACKEND_CONFIGURED) return request<{ ticket: string }>("/support/tickets", { method: "POST", body: JSON.stringify(form) });
    await mockCall(() => null, { dbMs: [600, 900] });
    return { ticket: `TKT-${Math.floor(100000 + Math.random() * 899999)}` };
  },
};

/* --------------------------------- crawler --------------------------------- */

const CRAWLS_KEY = "shopscale.crawls.v2";
const BLOCKED_HOSTS = ["private", "no-crawl", "members"];

export const crawlerService = {
  runs: (): CrawlRun[] => readStorage<CrawlRun[]>(CRAWLS_KEY, []),
  save: (runs: CrawlRun[]) => writeStorage(CRAWLS_KEY, runs),
  /** Simulated robots.txt check — hosts containing blocked words disallow crawling. */
  async checkRobots(seed: string) {
    await sleep(500);
    const host = new URL(seed).hostname;
    return !BLOCKED_HOSTS.some((b) => host.includes(b));
  },
  async start(seed: string): Promise<CrawlRun> {
    if (BACKEND_CONFIGURED) return request("/crawler/jobs", { method: "POST", body: JSON.stringify({ seed }) });
    const allowed = await this.checkRobots(seed);
    const run: CrawlRun = {
      id: `c-${Date.now()}`, seed, startedAt: new Date().toISOString(),
      status: allowed ? "running" : "blocked", robotsAllowed: allowed,
      discovered: 0, processed: 0, failed: 0, duplicates: 0, pendingReview: 0, imported: 0,
    };
    this.save([run, ...this.runs()]);
    return run;
  },
  tick(): CrawlRun[] {
    const runs = this.runs().map((r) => {
      if (r.status !== "running") return r;
      const discovered = r.discovered + 25 + Math.round(Math.random() * 40);
      const step = 20 + Math.round(Math.random() * 30); // throttled to respect crawl-rate limits
      const processed = Math.min(discovered, r.processed + step);
      const next: CrawlRun = {
        ...r, discovered, processed,
        failed: r.failed + (Math.random() > 0.75 ? 1 : 0),
        duplicates: r.duplicates + Math.round(Math.random() * 6),
        pendingReview: r.pendingReview + Math.round(Math.random() * 3),
      };
      if (next.processed >= 400) next.status = "completed";
      return next;
    });
    this.save(runs);
    return runs;
  },
  approve(id: string, count: number) {
    const runs = this.runs().map((r) => r.id === id ? { ...r, pendingReview: Math.max(0, r.pendingReview - count), imported: r.imported + count } : r);
    this.save(runs);
    return runs;
  },
  reject(id: string) {
    const runs = this.runs().map((r) => r.id === id ? { ...r, pendingReview: 0 } : r);
    this.save(runs);
    return runs;
  },
};

/* ------------------------------ system metrics ------------------------------ */

export const systemMetricsService = {
  cache, limiter, bus,
  /** Run N list requests against the mock API (lab experiment helper). */
  async experiment(n: number, bypass: boolean) {
    const prev = cache.bypass;
    cache.setBypass(bypass);
    const times: number[] = [];
    const queries: ProductQuery[] = [{ sort: "recommended" }, { filters: { fabric: ["Silk"] } }, { q: "banarasi" }, { filters: { state: ["West Bengal"] } }, { sort: "newest" }];
    for (let i = 0; i < n; i++) {
      try {
        const r = await productService.list(queries[i % queries.length], "lab-experiment");
        times.push(r.meta.ms);
      } catch { /* rate limited */ }
    }
    cache.setBypass(prev);
    const sorted = [...times].sort((a, b) => a - b);
    const pct = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ?? 0;
    return { avg: Math.round(times.reduce((a, b) => a + b, 0) / Math.max(1, times.length)), p95: pct(95), p99: pct(99), n: times.length };
  },
  /** Fire a burst of requests from a synthetic client to exercise the limiter. */
  async burst(n: number, client = "load-test-client") {
    let allowed = 0, blocked = 0;
    for (let i = 0; i < n; i++) {
      if (limiter.take(client) === 0) allowed++; else blocked++;
      if (i % 10 === 0) await sleep(5);
    }
    return { allowed, blocked };
  },
};