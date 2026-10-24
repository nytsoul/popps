import { CheckCircle2, FlaskConical, Loader2, Play, RefreshCw, Repeat, Send, Trash2, XCircle, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { JMETER_CURVE, JMETER_SCENARIOS, PRODUCTS } from "../../data/products";
import { useSim } from "../../hooks/useSim";
import { useStore } from "../../hooks/useStore";
import { bus, cache, limiter } from "../../lib/sim";
import { systemMetricsService } from "../../services";
import { BACKEND_CONFIGURED, API_BASE_URL } from "../../services/api";
import { cn } from "../../utils/cn";
import { PALETTE, Panel, Stat, btn, btnSolid, tooltipStyle } from "./AdminLayout";

const axis = { fontSize: 10, fill: "#8A7164" };

/* ============================ Redis & rate limiter ============================ */

export function AdminInfra() {
  useSim(cache, limiter);
  const { toast } = useStore();
  const [exp, setExp] = useState<{ cached?: Awaited<ReturnType<typeof systemMetricsService.experiment>>; uncached?: Awaited<ReturnType<typeof systemMetricsService.experiment>> }>({});
  const [running, setRunning] = useState(false);
  const [cap, setCap] = useState(limiter.capacity);
  const [rate, setRate] = useState(limiter.refillPerSec);
  const [burstN, setBurstN] = useState(150);
  const [burstRes, setBurstRes] = useState<{ allowed: number; blocked: number } | null>(null);

  const total = cache.hits + cache.misses;
  const ratio = total ? (cache.hits / total) * 100 : 0;
  const series = cache.samples.slice(-60).map((s, i) => ({ i, ms: s.ms, hit: s.result === "HIT" ? s.ms : null, miss: s.result !== "HIT" ? s.ms : null }));

  const limiterSeries = useMemo(() => {
    const now = Date.now();
    const buckets = Array.from({ length: 30 }, (_, i) => ({ t: `-${29 - i}s`, allowed: 0, blocked: 0 }));
    for (const e of limiter.timeline) {
      const age = Math.floor((now - e.at) / 1000);
      if (age < 30) { const b = buckets[29 - age]; e.allowed ? b.allowed++ : b.blocked++; }
    }
    return buckets;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limiter.timeline.length]);

  const runExperiment = async () => {
    setRunning(true);
    cache.invalidate("list:");
    const uncached = await systemMetricsService.experiment(25, true);
    const cached = await systemMetricsService.experiment(25, false);
    setExp({ cached, uncached });
    setRunning(false);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-darkroast">Redis Cache & Rate Limiter</h1>
        <p className="mt-1 text-xs text-mutedbrown">{BACKEND_CONFIGURED ? `Reading from ${API_BASE_URL}` : "Every storefront request flows through an in-browser cache-aside layer and token-bucket limiter that model the backend. Browse the store in another tab and watch these update."}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Hit ratio" value={`${ratio.toFixed(1)}%`} tone={ratio > 60 ? "good" : "warn"} />
        <Stat label="Hits" value={String(cache.hits)} />
        <Stat label="Misses" value={String(cache.misses)} />
        <Stat label="Bypassed" value={String(cache.bypassed)} />
        <Stat label="Keys cached" value={String(cache.size)} note={`TTL ${cache.ttlMs / 1000}s`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Panel title="Response time per request" subtitle="Last 60 requests — hits vs misses (ms, measured)"
          action={<button onClick={() => cache.resetStats()} className={btn}><RefreshCw className="h-3.5 w-3.5" aria-hidden /> Reset stats</button>}>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ left: -18, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6DAD3" />
                <XAxis dataKey="i" tick={false} />
                <YAxis tick={axis} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="hit" name="Cache HIT" fill={PALETTE.sage} />
                <Bar dataKey="miss" name="MISS / BYPASS" fill={PALETTE.terracotta} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {series.length === 0 && <p className="text-center text-xs text-mutedbrown">No requests yet — browse the storefront or run the experiment.</p>}
        </Panel>

        <Panel title="Cache controls" subtitle="Lab experiments">
          <label className="flex items-center justify-between border border-sand p-3 text-sm">
            <span>Bypass cache <span className="block text-[11px] text-mutedbrown">Every request hits the "database"</span></span>
            <input type="checkbox" checked={cache.bypass} onChange={(e) => cache.setBypass(e.target.checked)} className="h-5 w-5 accent-espresso" />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => toast(`Invalidated ${cache.invalidate("list:")} listing keys.`)} className={btn}>Invalidate list:*</button>
            <button onClick={() => toast(`Invalidated ${cache.invalidate("product:")} product keys.`)} className={btn}>Invalidate product:*</button>
            <button onClick={() => { cache.flush(); toast("Cache flushed."); }} className={btn}><Trash2 className="h-3.5 w-3.5" aria-hidden /> FLUSHALL</button>
            <button onClick={runExperiment} disabled={running} className={btnSolid}>{running ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <FlaskConical className="h-3.5 w-3.5" aria-hidden />} Cached vs uncached</button>
          </div>
          {exp.cached && exp.uncached && (
            <table className="mt-4 w-full text-xs">
              <thead className="text-[10px] uppercase text-mutedbrown"><tr><th className="py-1 text-left">25 requests</th><th>Avg</th><th>p95</th><th>p99</th></tr></thead>
              <tbody>
                <tr><td className="py-1">Uncached</td><td className="text-center">{exp.uncached.avg}ms</td><td className="text-center">{exp.uncached.p95}ms</td><td className="text-center">{exp.uncached.p99}ms</td></tr>
                <tr className="text-olivesage"><td className="py-1">Cached</td><td className="text-center">{exp.cached.avg}ms</td><td className="text-center">{exp.cached.p95}ms</td><td className="text-center">{exp.cached.p99}ms</td></tr>
              </tbody>
            </table>
          )}
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-mutedbrown">Recent invalidations</p>
          <ul className="mt-1 max-h-28 space-y-1 overflow-y-auto text-[11px] text-warmgray">
            {cache.invalidations.length === 0 && <li>None yet — restock a product in Orders & Inventory to see one.</li>}
            {cache.invalidations.map((i, k) => <li key={k}><span className="font-mono">{i.pattern}</span> — {i.removed} keys · {new Date(i.at).toLocaleTimeString()}</li>)}
          </ul>
        </Panel>
      </div>

      <Panel title="Cached keys" subtitle="Cache-aside entries currently held">
        <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
          {cache.keys.slice(0, 80).map((k) => <span key={k} className="max-w-xs truncate border border-sand bg-cream/50 px-2 py-0.5 font-mono text-[10px]">{k}</span>)}
          {cache.size === 0 && <span className="text-xs text-mutedbrown">Empty</span>}
        </div>
      </Panel>

      <h2 className="pt-4 font-display text-2xl text-darkroast">Rate Limiter</h2>
      <div className="grid gap-6 xl:grid-cols-[1fr_1.5fr]">
        <Panel title="Token bucket configuration" subtitle="Applies per client (models per-IP / per-user limits)">
          <label className="block text-xs text-warmgray">Burst capacity: <strong className="text-darkroast">{cap}</strong> tokens
            <input type="range" min={5} max={200} value={cap} onChange={(e) => setCap(Number(e.target.value))} className="mt-1 w-full accent-espresso" /></label>
          <label className="mt-3 block text-xs text-warmgray">Refill rate: <strong className="text-darkroast">{rate}</strong> req/s
            <input type="range" min={1} max={50} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="mt-1 w-full accent-espresso" /></label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => { limiter.configure(cap, rate); toast("Limiter configuration applied."); }} className={btnSolid}>Apply</button>
            <button onClick={() => limiter.configure(limiter.capacity, limiter.refillPerSec, !limiter.enabled)} className={btn}>{limiter.enabled ? "Disable limiter" : "Enable limiter"}</button>
            <button onClick={() => limiter.reset()} className={btn}>Reset buckets</button>
          </div>
          <div className="mt-5 border-t border-sand pt-4">
            <label className="block text-xs text-warmgray">Burst test — requests: <strong className="text-darkroast">{burstN}</strong>
              <input type="range" min={20} max={500} step={10} value={burstN} onChange={(e) => setBurstN(Number(e.target.value))} className="mt-1 w-full accent-espresso" /></label>
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={async () => setBurstRes(await systemMetricsService.burst(burstN))} className={btn}><Zap className="h-3.5 w-3.5" aria-hidden /> Burst (load-test client)</button>
              <button onClick={async () => { setBurstRes(await systemMetricsService.burst(burstN, "storefront")); toast("Storefront bucket drained — try browsing the shop to see the 429 screen.", "info"); }} className={btn}>Burst storefront</button>
            </div>
            {burstRes && <p className="mt-2 text-xs"><span className="text-olivesage">{burstRes.allowed} allowed</span> · <span className="text-terracotta">{burstRes.blocked} blocked (429)</span></p>}
          </div>
        </Panel>
        <Panel title="Allowed vs blocked — last 30s" subtitle={limiter.enabled ? `capacity ${limiter.capacity}, refill ${limiter.refillPerSec}/s` : "Limiter disabled"}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={limiterSeries} margin={{ left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6DAD3" />
                <XAxis dataKey="t" tick={axis} interval={4} />
                <YAxis tick={axis} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="allowed" stackId="a" name="Allowed" fill={PALETTE.mocha} />
                <Bar dataKey="blocked" stackId="a" name="Blocked (429)" fill={PALETTE.terracotta} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="mt-3 w-full text-xs">
            <thead className="text-[10px] uppercase text-mutedbrown"><tr><th className="py-1 text-left">Client</th><th>Tokens</th><th>Allowed</th><th>Blocked</th></tr></thead>
            <tbody className="divide-y divide-sand/60">
              {limiter.clients().map((c) => <tr key={c.client}><td className="py-1.5 font-mono">{c.client}</td><td className="text-center">{c.tokens}</td><td className="text-center">{c.allowed}</td><td className="text-center text-terracotta">{c.blocked}</td></tr>)}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
}

/* ================================= Kafka events ================================ */

const STATE_STYLE: Record<string, string> = {
  queued: "bg-sand text-warmgray", processing: "bg-info/10 text-info", processed: "bg-olivesage/15 text-olivesage",
  retrying: "bg-warning/15 text-warmgray", failed: "bg-error/10 text-error", duplicate: "bg-champagne/60 text-espresso",
};

export function AdminEvents() {
  useSim(bus);
  const [failure, setFailure] = useState(bus.failureRate);
  const stats = bus.stats();
  const publishTest = () => {
    const ref = `TEST-${Math.floor(1000 + Math.random() * 9000)}`;
    bus.publish("orders.created", ref, { reference: ref, items: [{ productId: PRODUCTS[0]?.id ?? "p-1", quantity: 0 }] });
  };
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-darkroast">Kafka Event Processing</h1>
        <p className="mt-1 text-xs text-mutedbrown">Asynchronous order pipeline: orders.created → inventory.reserved → notifications.requested → orders.status-updated → analytics.recorded. Consumers are idempotent by key; failures retry with exponential backoff, then go to the DLQ. Broker credentials never reach the browser.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Events" value={String(bus.log.length)} />
        <Stat label="Processed" value={String(bus.log.filter((e) => e.state === "processed").length)} tone="good" />
        <Stat label="Consumer lag" value={String(stats.reduce((a, s) => a + s.lag, 0))} />
        <Stat label="Retries" value={String(stats.reduce((a, s) => a + s.retries, 0))} tone="warn" />
        <Stat label="DLQ / failed" value={String(stats.reduce((a, s) => a + s.failed, 0))} tone="bad" />
      </div>
      <Panel title="Controls" subtitle="Place a real demo order from the storefront, or publish a test event">
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={publishTest} className={btnSolid}><Send className="h-3.5 w-3.5" aria-hidden /> Publish test orders.created</button>
          <label className="flex items-center gap-2 text-xs text-warmgray">Transient failure rate: <strong className="text-darkroast">{Math.round(failure * 100)}%</strong>
            <input type="range" min={0} max={0.8} step={0.04} value={failure} onChange={(e) => { const v = Number(e.target.value); setFailure(v); bus.failureRate = v; }} className="accent-espresso" /></label>
        </div>
      </Panel>
      <Panel title="Topics & consumer groups">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="text-[10px] uppercase tracking-[0.12em] text-mutedbrown"><tr>{["Topic", "Events", "Processed", "Lag", "Retries", "Failed", "Duplicates skipped"].map((h) => <th key={h} className="py-2 pr-3 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-sand/70">
              {stats.map((s) => (
                <tr key={s.topic}><td className="py-2.5 pr-3 font-mono text-espresso">{s.topic}</td><td className="pr-3">{s.total}</td><td className="pr-3 text-olivesage">{s.processed}</td><td className="pr-3">{s.lag}</td><td className="pr-3">{s.retries}</td><td className="pr-3 text-error">{s.failed}</td><td>{s.duplicates}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Event log" subtitle="Newest first · replay to demonstrate idempotency">
        <div className="max-h-[50vh] overflow-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="sticky top-0 bg-white text-[10px] uppercase tracking-[0.12em] text-mutedbrown"><tr>{["Time", "Event", "Topic", "Key", "Consumer", "State", "Attempts", "Note", ""].map((h) => <th key={h} className="py-2 pr-3 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-sand/70">
              {bus.log.length === 0 && <tr><td colSpan={9} className="py-8 text-center text-mutedbrown">No events yet. Place a demo order or publish a test event.</td></tr>}
              {bus.log.map((e) => (
                <tr key={e.id}>
                  <td className="py-2 pr-3 text-warmgray">{new Date(e.at).toLocaleTimeString()}</td>
                  <td className="pr-3 font-mono">{e.id}</td>
                  <td className="pr-3 font-mono text-espresso">{e.topic}</td>
                  <td className="max-w-32 truncate pr-3 font-mono">{e.key}</td>
                  <td className="pr-3">{e.consumer ?? "—"}</td>
                  <td className="pr-3"><span className={cn("px-2 py-0.5 text-[10px] font-medium", STATE_STYLE[e.state])}>{e.state}</span></td>
                  <td className="pr-3">{e.attempts}</td>
                  <td className="max-w-56 truncate pr-3 text-mutedbrown">{e.note ?? ""}</td>
                  <td><button onClick={() => bus.replay(e.id)} aria-label={`Replay ${e.id}`} className="p-1 text-mutedbrown hover:text-espresso"><Repeat className="h-3.5 w-3.5" aria-hidden /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* ============================== JMeter & health ============================== */

export function AdminPerformance() {
  useSim(cache, limiter, bus);
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState(() => new Date());
  const data = JMETER_SCENARIOS.map((s) => ({ scenario: s.scenario, "Baseline p95": s.baseline.p95Ms, "Optimised p95": s.optimized.p95Ms, "Baseline req/s": s.baseline.throughput, "Optimised req/s": s.optimized.throughput }));
  const stats = bus.stats();
  const health = [
    { name: "Storefront API (mock adapter)", ok: true, detail: BACKEND_CONFIGURED ? API_BASE_URL : "In-browser mock transport" },
    { name: "Redis cache (simulated)", ok: !cache.bypass, detail: cache.bypass ? "Bypass mode ON" : `${cache.size} keys` },
    { name: "Rate limiter (simulated)", ok: limiter.enabled, detail: limiter.enabled ? `${limiter.capacity} burst / ${limiter.refillPerSec} rps` : "Disabled" },
    { name: "Kafka consumers (simulated)", ok: stats.every((s) => s.lag < 10), detail: `lag ${stats.reduce((a, s) => a + s.lag, 0)} · DLQ ${stats.find((s) => s.topic === "dlq")?.total ?? 0}` },
    { name: "Database (PostgreSQL)", ok: BACKEND_CONFIGURED, detail: BACKEND_CONFIGURED ? "Via backend" : "Not connected — local seed data" },
    { name: "Crawler workers", ok: true, detail: "Simulated queue" },
  ];
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-darkroast">JMeter Reports & System Health</h1>
        <p className="mt-1 text-xs text-mutedbrown">JMeter figures below are illustrative SAMPLE data — not real benchmarks. Replace them by importing summary reports from your own test runs (see docs/jmeter.md).</p>
      </header>
      <Panel title="System health" subtitle={`Last checked ${checkedAt.toLocaleTimeString()}`} kind="simulated"
        action={<button onClick={async () => { setChecking(true); await new Promise((r) => setTimeout(r, 600)); setCheckedAt(new Date()); setChecking(false); }} className={btn}>{checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />} Re-check</button>}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {health.map((h) => (
            <div key={h.name} className="flex items-start gap-3 border border-sand p-3">
              {h.ok ? <CheckCircle2 className="h-5 w-5 shrink-0 text-olivesage" aria-hidden /> : <XCircle className="h-5 w-5 shrink-0 text-warning" aria-hidden />}
              <div><p className="text-sm text-darkroast">{h.name}</p><p className="text-[11px] text-mutedbrown">{h.detail}</p></div>
            </div>
          ))}
        </div>
      </Panel>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="p95 latency by scenario (ms)" subtitle="500 concurrent users · baseline vs Redis + async orders" kind="sample">
          <div className="h-72"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6DAD3" /><XAxis dataKey="scenario" tick={axis} interval={0} angle={-18} textAnchor="end" height={55} /><YAxis tick={axis} />
              <Tooltip contentStyle={tooltipStyle} /><Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Baseline p95" fill={PALETTE.latte} /><Bar dataKey="Optimised p95" fill={PALETTE.sage} />
            </BarChart>
          </ResponsiveContainer></div>
        </Panel>
        <Panel title="Throughput by scenario (req/s)" kind="sample">
          <div className="h-72"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6DAD3" /><XAxis dataKey="scenario" tick={axis} interval={0} angle={-18} textAnchor="end" height={55} /><YAxis tick={axis} />
              <Tooltip contentStyle={tooltipStyle} /><Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Baseline req/s" fill={PALETTE.latte} /><Bar dataKey="Optimised req/s" fill={PALETTE.espresso} />
            </BarChart>
          </ResponsiveContainer></div>
        </Panel>
      </div>
      <Panel title="Average response time vs concurrent users — listing & search" kind="sample">
        <div className="h-64"><ResponsiveContainer width="100%" height="100%">
          <LineChart data={JMETER_CURVE} margin={{ left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E6DAD3" /><XAxis dataKey="users" tick={axis} label={{ value: "Concurrent users", position: "insideBottom", offset: -2, fontSize: 10 }} /><YAxis tick={axis} />
            <Tooltip contentStyle={tooltipStyle} /><Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="baseline" name="Uncached (ms)" stroke={PALETTE.terracotta} strokeWidth={2} />
            <Line type="monotone" dataKey="optimized" name="Cached (ms)" stroke={PALETTE.sage} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer></div>
      </Panel>
      <Panel title="Scenario summary" subtitle="Baseline → optimised" kind="sample">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="text-[10px] uppercase tracking-[0.12em] text-mutedbrown"><tr>{["Scenario", "Users", "Throughput", "Avg ms", "p95 ms", "p99 ms", "Error %"].map((h) => <th key={h} className="py-2 pr-3 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-sand/70">
              {JMETER_SCENARIOS.map(({ scenario, baseline: b, optimized: o }) => (
                <tr key={scenario}>
                  <td className="py-2.5 pr-3 font-medium">{scenario}</td><td className="pr-3">{b.users}</td>
                  <td className="pr-3">{b.throughput} → <span className="text-olivesage">{o.throughput}</span></td>
                  <td className="pr-3">{b.avgMs} → <span className="text-olivesage">{o.avgMs}</span></td>
                  <td className="pr-3">{b.p95Ms} → <span className="text-olivesage">{o.p95Ms}</span></td>
                  <td className="pr-3">{b.p99Ms} → <span className="text-olivesage">{o.p99Ms}</span></td>
                  <td>{b.errorPct}% → <span className="text-olivesage">{o.errorPct}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Live in-browser latency (measured)" subtitle="From the simulated cache layer — real measurements of the mock transport">
        <div className="h-48"><ResponsiveContainer width="100%" height="100%">
          <AreaChart data={cache.samples.slice(-80).map((s, i) => ({ i, ms: s.ms }))} margin={{ left: -18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E6DAD3" /><XAxis dataKey="i" tick={false} /><YAxis tick={axis} /><Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="ms" stroke={PALETTE.mocha} fill={PALETTE.champagne} name="ms" />
          </AreaChart>
        </ResponsiveContainer></div>
      </Panel>
    </div>
  );
}