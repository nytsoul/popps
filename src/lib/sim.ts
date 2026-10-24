/* ===========================================================================
   In-browser SIMULATIONS of ShopScale's backend infrastructure.
   They let the System Design Lab demo run without servers:
     • SimCache      → models Redis cache-aside (TTL, hits/misses, invalidation)
     • RateLimiter   → token bucket per client (models API gateway limiter)
     • EventBus      → models Kafka topics, consumer groups, retries, DLQ
   Every metric shown from these is labelled "simulated" in the admin UI.
   When VITE_API_BASE_URL is set, services call the real backend instead.
=========================================================================== */

type Listener = () => void;

class Emitter {
  private listeners = new Set<Listener>();
  subscribe = (fn: Listener) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  protected emit() { this.listeners.forEach((l) => l()); }
}

/* ------------------------------- Cache ------------------------------- */

export interface CacheSample { at: number; key: string; ms: number; result: "HIT" | "MISS" | "BYPASS" }

class SimCache extends Emitter {
  private store = new Map<string, { value: unknown; expires: number }>();
  ttlMs = 60_000;
  bypass = false;
  hits = 0;
  misses = 0;
  bypassed = 0;
  invalidations: { at: number; pattern: string; removed: number }[] = [];
  samples: CacheSample[] = [];

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expires < Date.now()) { this.store.delete(key); return undefined; }
    return entry.value as T;
  }
  set(key: string, value: unknown) {
    this.store.set(key, { value, expires: Date.now() + this.ttlMs });
  }
  record(sample: CacheSample) {
    if (sample.result === "HIT") this.hits++;
    else if (sample.result === "MISS") this.misses++;
    else this.bypassed++;
    this.samples.push(sample);
    if (this.samples.length > 400) this.samples.shift();
    this.emit();
  }
  /** Invalidate keys that start with any of the given prefixes. */
  invalidate(...prefixes: string[]) {
    let removed = 0;
    for (const key of [...this.store.keys()]) {
      if (prefixes.some((p) => key.startsWith(p))) { this.store.delete(key); removed++; }
    }
    this.invalidations.unshift({ at: Date.now(), pattern: prefixes.join(", "), removed });
    this.invalidations = this.invalidations.slice(0, 20);
    this.emit();
    return removed;
  }
  setBypass(v: boolean) { this.bypass = v; this.emit(); }
  flush() { const n = this.store.size; this.store.clear(); this.invalidations.unshift({ at: Date.now(), pattern: "* (FLUSHALL)", removed: n }); this.emit(); }
  resetStats() { this.hits = 0; this.misses = 0; this.bypassed = 0; this.samples = []; this.emit(); }
  get size() { return this.store.size; }
  get keys() { return [...this.store.keys()]; }
}

export const cache = new SimCache();

/* ---------------------------- Rate limiter --------------------------- */

interface Bucket { tokens: number; updated: number; allowed: number; blocked: number }

class RateLimiter extends Emitter {
  capacity = 40;           // burst size
  refillPerSec = 4;        // sustained rate
  enabled = true;
  private buckets = new Map<string, Bucket>();
  timeline: { at: number; client: string; allowed: boolean }[] = [];

  private bucket(client: string) {
    let b = this.buckets.get(client);
    const now = Date.now();
    if (!b) { b = { tokens: this.capacity, updated: now, allowed: 0, blocked: 0 }; this.buckets.set(client, b); }
    const refill = ((now - b.updated) / 1000) * this.refillPerSec;
    b.tokens = Math.min(this.capacity, b.tokens + refill);
    b.updated = now;
    return b;
  }
  /** Returns 0 if allowed, otherwise seconds until a token is available. */
  take(client = "storefront"): number {
    const b = this.bucket(client);
    let wait = 0;
    if (!this.enabled || b.tokens >= 1) {
      if (this.enabled) b.tokens -= 1;
      b.allowed++;
    } else {
      b.blocked++;
      wait = Math.max(1, Math.ceil((1 - b.tokens) / this.refillPerSec));
    }
    this.timeline.push({ at: Date.now(), client, allowed: wait === 0 });
    if (this.timeline.length > 3000) this.timeline.splice(0, 500);
    this.emit();
    return wait;
  }
  configure(capacity: number, refillPerSec: number, enabled = this.enabled) {
    this.capacity = capacity; this.refillPerSec = refillPerSec; this.enabled = enabled;
    this.buckets.clear();
    this.emit();
  }
  clients() {
    return [...this.buckets.entries()].map(([client, b]) => {
      this.bucket(client);
      return { client, tokens: Math.floor(b.tokens), allowed: b.allowed, blocked: b.blocked };
    });
  }
  reset() { this.buckets.clear(); this.timeline = []; this.emit(); }
}

export const limiter = new RateLimiter();

/* ------------------------------ Event bus ---------------------------- */

export type Topic =
  | "orders.created" | "inventory.reserved" | "notifications.requested"
  | "orders.status-updated" | "analytics.recorded" | "dlq";

export interface BusEvent<T = unknown> {
  id: string;
  topic: Topic;
  key: string;            // idempotency / partition key (e.g. order reference)
  payload: T;
  at: number;
  attempts: number;
  state: "queued" | "processing" | "processed" | "retrying" | "failed" | "duplicate";
  consumer?: string;
  note?: string;
}

type Handler = (e: BusEvent) => Promise<void> | void;
interface Consumer { topic: Topic; group: string; handler: Handler; processedKeys: Set<string> }

class EventBus extends Emitter {
  log: BusEvent[] = [];
  failureRate = 0.12;              // simulated transient failure probability
  maxAttempts = 3;
  private consumers: Consumer[] = [];
  private seq = 0;

  subscribe_(topic: Topic, group: string, handler: Handler) {
    this.consumers.push({ topic, group, handler, processedKeys: new Set() });
  }

  publish<T>(topic: Topic, key: string, payload: T): BusEvent<T> {
    const event: BusEvent<T> = { id: `evt-${++this.seq}`, topic, key, payload, at: Date.now(), attempts: 0, state: "queued" };
    this.log.unshift(event as BusEvent);
    if (this.log.length > 300) this.log.pop();
    this.emit();
    for (const c of this.consumers.filter((x) => x.topic === topic)) {
      void this.deliver(event as BusEvent, c);
    }
    return event;
  }

  private async deliver(event: BusEvent, c: Consumer): Promise<void> {
    await new Promise((r) => setTimeout(r, 350 + Math.random() * 500));
    const dedupeKey = `${event.topic}:${event.key}`;
    if (c.processedKeys.has(dedupeKey)) {
      event.state = "duplicate";
      event.consumer = c.group;
      event.note = "Idempotency key already processed — skipped";
      this.emit();
      return;
    }
    event.state = "processing";
    event.consumer = c.group;
    event.attempts++;
    this.emit();
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));
    const transient = event.topic !== "dlq" && Math.random() < this.failureRate;
    if (transient) {
      if (event.attempts < this.maxAttempts) {
        event.state = "retrying";
        event.note = `Transient failure — retry ${event.attempts}/${this.maxAttempts - 1} with backoff`;
        this.emit();
        await new Promise((r) => setTimeout(r, 400 * 2 ** event.attempts));
        return this.deliver(event, c);
      }
      event.state = "failed";
      event.note = "Max attempts reached — moved to DLQ";
      this.emit();
      this.publish("dlq", event.key, { original: event.id, topic: event.topic });
      return;
    }
    try {
      await c.handler(event);
      c.processedKeys.add(dedupeKey);
      event.state = "processed";
      event.note = event.note ?? "OK";
    } catch (err) {
      event.state = "failed";
      event.note = String(err);
    }
    this.emit();
  }

  /** Re-publish an existing event (demonstrates idempotent consumers). */
  replay(id: string) {
    const e = this.log.find((x) => x.id === id);
    if (e) this.publish(e.topic, e.key, e.payload);
  }

  stats() {
    const topics: Topic[] = ["orders.created", "inventory.reserved", "notifications.requested", "orders.status-updated", "analytics.recorded", "dlq"];
    return topics.map((topic) => {
      const ev = this.log.filter((e) => e.topic === topic);
      return {
        topic,
        total: ev.length,
        processed: ev.filter((e) => e.state === "processed").length,
        lag: ev.filter((e) => e.state === "queued" || e.state === "processing" || e.state === "retrying").length,
        retries: ev.reduce((a, e) => a + Math.max(0, e.attempts - 1), 0),
        failed: ev.filter((e) => e.state === "failed").length,
        duplicates: ev.filter((e) => e.state === "duplicate").length,
      };
    });
  }
}

export const bus = new EventBus();

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));