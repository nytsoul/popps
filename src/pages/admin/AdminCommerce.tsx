import { AlertTriangle, Copy, ExternalLink, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Link } from "react-router-dom";
import { VARIETIES, ZONES } from "../../data/catalogue";
import { PRODUCTS } from "../../data/products";
import { useStore } from "../../hooks/useStore";
import { inr, shortDate } from "../../lib/format";
import { orderService, productService, shortLinkService } from "../../services";
import { availabilityOf } from "../../services/filters";
import type { Order, ShortLink } from "../../types";
import { cn } from "../../utils/cn";
import { PALETTE, Panel, Stat, btn, btnSolid, tooltipStyle } from "./AdminLayout";

const STATUS_COLOR: Record<Order["status"], string> = {
  placed: "bg-champagne/70 text-espresso", confirmed: "bg-champagne/70 text-espresso", processing: "bg-warning/15 text-warmgray",
  packed: "bg-warning/15 text-warmgray", shipped: "bg-info/10 text-info", delivered: "bg-olivesage/15 text-olivesage", cancelled: "bg-error/10 text-error",
};

/* --------------------------------- Overview -------------------------------- */

export function AdminOverview() {
  const orders = useMemo(() => orderService.history(), []);
  const revenue = orders.reduce((a, o) => a + o.total, 0);
  const low = PRODUCTS.filter((p) => p.stock <= 3);
  const byZone = ZONES.map((z) => ({ zone: z.replace(" India", ""), products: PRODUCTS.filter((p) => p.zone === z).length, varieties: VARIETIES.filter((v) => v.zone === z).length }));
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-darkroast">Commerce Overview</h1>
        <p className="mt-1 text-xs text-mutedbrown">Local demo dataset. Set VITE_API_BASE_URL to read live figures from the backend.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Products" value={String(PRODUCTS.length)} note={`${VARIETIES.length} catalogued varieties`} />
        <Stat label="Orders (demo)" value={String(orders.length)} note="incl. sample orders" />
        <Stat label="Revenue (demo)" value={inr(revenue)} note="mock checkout totals" />
        <Stat label="Inventory units" value={String(PRODUCTS.reduce((a, p) => a + p.stock, 0))} note={`${low.length} low-stock alerts`} tone={low.length ? "warn" : "good"} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Catalogue coverage by region" subtitle="Listed products vs. catalogued varieties" kind="local">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byZone} margin={{ left: -18, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6DAD3" />
                <XAxis dataKey="zone" tick={{ fontSize: 10, fill: "#8A7164" }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10, fill: "#8A7164" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="varieties" name="Varieties" fill={PALETTE.champagne} />
                <Bar dataKey="products" name="Products" fill={PALETTE.espresso} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Inventory alerts" subtitle="At or below 3 units" kind="local" action={<Link to="/admin/orders" className="text-[11px] text-mocha underline">Manage</Link>}>
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {low.map((p) => (
              <li key={p.id} className="flex items-center gap-3 border border-sand/70 bg-cream/40 p-2.5">
                <AlertTriangle className={cn("h-4 w-4 shrink-0", p.stock === 0 ? "text-error" : "text-warning")} aria-hidden />
                <Link to={`/product/${p.slug}`} className="min-w-0 flex-1 truncate text-xs hover:text-espresso">{p.name}</Link>
                <span className={cn("text-xs font-semibold", p.stock === 0 ? "text-error" : "text-warmgray")}>{p.stock === 0 ? "Out" : `${p.stock} left`}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel title="Recent orders" kind="local" action={<Link to="/admin/orders" className="text-[11px] text-mocha underline">All orders</Link>}>
        <OrdersTable orders={orders.slice(0, 6)} />
      </Panel>
    </div>
  );
}

function OrdersTable({ orders }: { orders: Order[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-xs">
        <thead className="text-[10px] uppercase tracking-[0.12em] text-mutedbrown">
          <tr><th className="py-2 pr-3 font-medium">Reference</th><th className="py-2 pr-3 font-medium">Date</th><th className="py-2 pr-3 font-medium">Customer</th><th className="py-2 pr-3 font-medium">Items</th><th className="py-2 pr-3 font-medium">Total</th><th className="py-2 font-medium">Status</th></tr>
        </thead>
        <tbody className="divide-y divide-sand/70">
          {orders.map((o) => (
            <tr key={o.id}>
              <td className="py-2.5 pr-3"><Link to={`/track?ref=${o.reference}&email=${encodeURIComponent(o.email)}`} className="font-mono text-[11px] text-espresso hover:underline">{o.reference}</Link></td>
              <td className="py-2.5 pr-3 text-warmgray">{shortDate(o.createdAt)}</td>
              <td className="py-2.5 pr-3">{o.address.fullName}</td>
              <td className="py-2.5 pr-3">{o.items.reduce((a, i) => a + i.quantity, 0)}</td>
              <td className="py-2.5 pr-3">{inr(o.total)}</td>
              <td className="py-2.5"><span className={cn("px-2 py-0.5 text-[10px] font-medium capitalize", STATUS_COLOR[o.status])}>{o.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------ Products & varieties ------------------------- */

export function AdminCatalogue() {
  const [tab, setTab] = useState<"products" | "varieties" | "collections">("products");
  const [q, setQ] = useState("");
  const [zone, setZone] = useState("All");
  const products = PRODUCTS.filter((p) => (zone === "All" || p.zone === zone) && [p.name, p.variety, p.state, p.fabric].join(" ").toLowerCase().includes(q.toLowerCase()));
  const varieties = VARIETIES.filter((v) => (zone === "All" || v.zone === zone) && [v.name, v.state, v.country, ...v.aliases].join(" ").toLowerCase().includes(q.toLowerCase()));
  const collections = useMemo(() => {
    const m: Record<string, number> = {};
    PRODUCTS.forEach((p) => p.collections.forEach((c) => (m[c] = (m[c] ?? 0) + 1)));
    m["Bestsellers"] = PRODUCTS.filter((p) => p.bestseller).length;
    m["New Arrivals"] = PRODUCTS.filter((p) => p.isNew).length;
    m["On Sale"] = PRODUCTS.filter((p) => p.originalPrice).length;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-darkroast">Products & Regional Varieties</h1>
          <p className="mt-1 text-xs text-mutedbrown">Varieties are data — add a line to <code className="font-mono">src/data/catalogue.ts</code> (or a backend row) and the UI updates automatically.</p>
        </div>
        <div className="flex gap-1 border border-sand bg-white p-1">
          {(["products", "varieties", "collections"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn("px-3 py-1.5 text-xs capitalize", tab === t ? "bg-espresso text-cream" : "text-warmgray")}>{t}</button>
          ))}
        </div>
      </header>
      {tab !== "collections" && (
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-1 items-center gap-2 border border-sand bg-white px-3 py-2 sm:max-w-sm">
            <Search className="h-3.5 w-3.5 text-mutedbrown" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${tab}…`} aria-label={`Search ${tab}`} className="w-full bg-transparent text-xs focus:outline-none" />
          </div>
          <select value={zone} onChange={(e) => setZone(e.target.value)} aria-label="Region" className="border border-sand bg-white px-3 py-2 text-xs">
            <option>All</option>{ZONES.map((z) => <option key={z}>{z}</option>)}
          </select>
        </div>
      )}
      {tab === "products" && (
        <Panel title={`${products.length} products`} kind="local">
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full min-w-[860px] text-left text-xs">
              <thead className="sticky top-0 bg-cream text-[10px] uppercase tracking-[0.12em] text-mutedbrown">
                <tr>{["Product", "Variety", "Region", "Fabric", "Composition", "Loom", "Price", "Stock", "Origin"].map((h) => <th key={h} className="px-3 py-2.5 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-sand/70">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-cream/50">
                    <td className="px-3 py-2"><Link to={`/product/${p.slug}`} className="flex items-center gap-2 hover:text-espresso"><img src={p.images[0]} alt="" className="h-10 w-8 object-cover" loading="lazy" /><span className="max-w-44 truncate">{p.name}</span></Link></td>
                    <td className="px-3 py-2">{p.variety}</td>
                    <td className="px-3 py-2 text-warmgray">{p.state}</td>
                    <td className="px-3 py-2">{p.fabric}</td>
                    <td className="px-3 py-2">{p.composition}</td>
                    <td className="px-3 py-2">{p.loom}</td>
                    <td className="px-3 py-2">{inr(p.price)}</td>
                    <td className="px-3 py-2"><span className={cn("px-2 py-0.5 text-[10px]", p.stock === 0 ? "bg-error/10 text-error" : p.stock <= 3 ? "bg-warning/15" : "bg-olivesage/15 text-olivesage")}>{p.stock}</span></td>
                    <td className="px-3 py-2">{p.originVerified ? <span className="text-olivesage">Verified</span> : <span className="text-mutedbrown">Unverified</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
      {tab === "varieties" && (
        <Panel title={`${varieties.length} varieties`} kind="local">
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="sticky top-0 bg-cream text-[10px] uppercase tracking-[0.12em] text-mutedbrown">
                <tr>{["Variety", "State / Country", "Kind", "Status", "Fabrics", "Techniques", "Listed"].map((h) => <th key={h} className="px-3 py-2.5 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-sand/70">
                {varieties.map((v) => (
                  <tr key={v.slug}>
                    <td className="px-3 py-2"><Link to={`/shop?variety=${encodeURIComponent(v.name)}`} className="hover:text-espresso">{v.name}</Link></td>
                    <td className="px-3 py-2 text-warmgray">{v.state}{v.country !== "India" && v.state !== v.country ? `, ${v.country}` : ""}</td>
                    <td className="px-3 py-2">{v.kind}</td>
                    <td className="px-3 py-2">{v.status === "established" ? <span className="text-olivesage">Established</span> : <span className="italic text-mocha">Inspired</span>}</td>
                    <td className="px-3 py-2">{v.fabrics.join(", ")}</td>
                    <td className="px-3 py-2">{v.techniques.join(", ")}</td>
                    <td className="px-3 py-2">{PRODUCTS.filter((p) => p.variety === v.name).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
      {tab === "collections" && (
        <Panel title="Collections" subtitle="Derived from product tags" kind="local">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map(([c, n]) => (
              <Link key={c} to={`/shop?collection=${encodeURIComponent(c)}`} className="flex items-center justify-between border border-sand p-3 hover:border-espresso">
                <span className="text-sm">{c}</span><span className="text-xs text-mutedbrown">{n} products</span>
              </Link>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ------------------------------ Orders & inventory ---------------------------- */

export function AdminOrders() {
  const { toast } = useStore();
  const [orders] = useState(() => orderService.history());
  const [, setTick] = useState(0);
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const inv = PRODUCTS.filter((p) => filter === "all" || (filter === "low" ? availabilityOf(p) === "Low stock" : p.stock === 0));

  const save = (id: string) => {
    const n = Number(edits[id]);
    if (!Number.isFinite(n) || n < 0) { toast("Enter a valid stock quantity.", "error"); return; }
    const removed = productService.updateStock(id, n);
    toast(`Stock updated. ${removed} cache key${removed === 1 ? "" : "s"} invalidated (product, listings, related).`);
    setEdits((e) => { const c = { ...e }; delete c[id]; return c; });
    setTick((t) => t + 1);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-darkroast">Orders & Inventory</h1>
        <p className="mt-1 text-xs text-mutedbrown">Order statuses are advanced by simulated Kafka consumers. Restocking demonstrates cache invalidation.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Orders" value={String(orders.length)} />
        <Stat label="In transit" value={String(orders.filter((o) => ["processing", "packed", "shipped"].includes(o.status)).length)} />
        <Stat label="Low stock" value={String(PRODUCTS.filter((p) => availabilityOf(p) === "Low stock").length)} tone="warn" />
        <Stat label="Out of stock" value={String(PRODUCTS.filter((p) => p.stock === 0).length)} tone="bad" />
      </div>
      <Panel title="Orders" kind="local"><OrdersTable orders={orders} /></Panel>
      <Panel title="Inventory" subtitle="Edit stock and save — dependent cache keys are invalidated" kind="local"
        action={<select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Inventory filter" className="border border-sand px-2 py-1 text-xs"><option value="all">All</option><option value="low">Low stock</option><option value="out">Out of stock</option></select>}>
        <div className="max-h-[55vh] overflow-auto">
          <table className="w-full min-w-[620px] text-left text-xs">
            <thead className="sticky top-0 bg-cream text-[10px] uppercase tracking-[0.12em] text-mutedbrown">
              <tr><th className="px-3 py-2.5 font-medium">Product</th><th className="px-3 py-2.5 font-medium">Availability</th><th className="px-3 py-2.5 font-medium">Stock</th><th className="px-3 py-2.5 font-medium">Update</th></tr>
            </thead>
            <tbody className="divide-y divide-sand/70">
              {inv.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2">{p.name}<span className="block text-[10px] text-mutedbrown">{p.id} · {p.variety}</span></td>
                  <td className="px-3 py-2">{availabilityOf(p)}</td>
                  <td className="px-3 py-2 font-medium">{p.stock}</td>
                  <td className="px-3 py-2">
                    <form onSubmit={(e) => { e.preventDefault(); save(p.id); }} className="flex gap-2">
                      <input value={edits[p.id] ?? ""} onChange={(e) => setEdits({ ...edits, [p.id]: e.target.value.replace(/\D/g, "") })} placeholder={String(p.stock)} aria-label={`New stock for ${p.name}`} className="w-20 border border-sand px-2 py-1" />
                      <button disabled={edits[p.id] == null || edits[p.id] === ""} className={btn}>Save</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* --------------------------------- Short links -------------------------------- */

export function AdminLinks() {
  const { toast } = useStore();
  const [links, setLinks] = useState<ShortLink[]>(() => shortLinkService.all());
  const [target, setTarget] = useState("/shop?state=Kerala");
  const [label, setLabel] = useState("Kerala collection");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!target.startsWith("/")) { setErr("Target must be an internal path starting with “/”, e.g. /product/… or /shop?…"); return; }
    setErr(null); setBusy(true);
    try { await shortLinkService.create(target, label || target); setLinks(shortLinkService.all()); toast("Short link created."); }
    catch { toast("Could not create link.", "error"); }
    finally { setBusy(false); }
  };
  const total = links.reduce((a, l) => a + l.clicks, 0);
  const refData = Object.entries(links.reduce<Record<string, number>>((a, l) => { Object.entries(l.referrers).forEach(([r, n]) => (a[r] = (a[r] ?? 0) + n)); return a; }, {})).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-darkroast">URL Shortener</h1>
        <p className="mt-1 text-xs text-mutedbrown">Short links resolve at <code className="font-mono">#/s/:code</code>, record a click and referrer, then redirect.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Links" value={String(links.length)} /><Stat label="Total clicks" value={String(total)} /><Stat label="Top link" value={links.slice().sort((a, b) => b.clicks - a.clicks)[0]?.code ?? "—"} />
      </div>
      <Panel title="Create short link" kind="local">
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-[2fr_1.5fr_auto]">
          <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="/product/… or /shop?…" aria-label="Target path" className="border border-sand px-3 py-2 text-sm" />
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" aria-label="Label" className="border border-sand px-3 py-2 text-sm" />
          <button disabled={busy} className={btnSolid}>{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Plus className="h-3.5 w-3.5" aria-hidden />} Shorten</button>
        </form>
        {err && <p className="mt-2 text-xs text-error">{err}</p>}
      </Panel>
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Links" kind="local">
          <ul className="divide-y divide-sand/70">
            {links.map((l) => (
              <li key={l.code} className="flex flex-wrap items-center gap-3 py-3">
                <span className="bg-espresso px-2 py-1 font-mono text-[10px] text-cream">/s/{l.code}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-darkroast">{l.label}</p>
                  <p className="truncate text-[10px] text-mutedbrown">{l.target} · {shortDate(l.createdAt)} · {Object.entries(l.referrers).map(([r, n]) => `${r} ${n}`).join(", ") || "no referrers yet"}</p>
                </div>
                <span className="text-sm font-semibold text-espresso">{l.clicks}</span>
                <button onClick={() => { navigator.clipboard?.writeText(shortLinkService.url(l.code)).then(() => toast("Copied."), () => toast("Clipboard unavailable.", "error")); }} aria-label="Copy link" className="p-1 text-mutedbrown hover:text-espresso"><Copy className="h-3.5 w-3.5" aria-hidden /></button>
                <a href={`#/s/${l.code}`} target="_blank" rel="noreferrer" aria-label="Open link in new tab" className="p-1 text-mutedbrown hover:text-espresso"><ExternalLink className="h-3.5 w-3.5" aria-hidden /></a>
                <button onClick={() => { shortLinkService.remove(l.code); setLinks(shortLinkService.all()); }} aria-label="Delete link" className="p-1 text-mutedbrown hover:text-error"><Trash2 className="h-3.5 w-3.5" aria-hidden /></button>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Clicks by referrer" kind="local">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={refData} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: "#8A7164" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#8A7164" }} width={80} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" name="Clicks">{refData.map((_, i) => <Cell key={i} fill={[PALETTE.espresso, PALETTE.mocha, PALETTE.latte, PALETTE.terracotta, PALETTE.sage][i % 5]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
      <p className="text-[11px] text-mutedbrown">Links are deduplicated by target path.</p>
    </div>
  );
}