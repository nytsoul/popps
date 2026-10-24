import { AlertTriangle, Bell, Check, Eye, ImagePlus, Package, Plus, Save, Trash2, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { IMG, img } from "../../data/catalogue";
import { useStore } from "../../hooks/useStore";
import { inr, shortDate } from "../../lib/format";
import { alertService, auditService, contentService, productCatalog, returnService, type HomeContent } from "../../services/catalog";
import { orderService } from "../../services";
import { availabilityOf } from "../../services/filters";
import type { Banner } from "../../types";
import { cn } from "../../utils/cn";
import { Panel, Stat, btn, btnSolid } from "./AdminLayout";

/* -------------------------------- Dashboard -------------------------------- */

export function AdminDashboard() {
  const c = productCatalog.counts();
  const orders = useMemo(() => orderService.history(), []);
  const byStatus = useMemo(() => {
    const m: Record<string, number> = {};
    orders.forEach((o) => { m[o.status] = (m[o.status] ?? 0) + 1; });
    return m;
  }, [orders]);
  const revenue = orders.reduce((a, o) => a + o.total, 0);
  const audit = auditService.list().slice(0, 8);

  const quick = [
    { label: "Add Saree", to: "/admin/products/new", primary: true },
    { label: "Manage Products", to: "/admin/products" },
    { label: "Manage Inventory", to: "/admin/inventory" },
    { label: "View Orders", to: "/admin/orders" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-darkroast">Dashboard</h1>
        <p className="mt-1 text-xs text-mutedbrown">Sample metrics from the local demo dataset — clearly labelled, never presented as live production data.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total products" value={String(c.total)} note={`${c.published} published · ${c.draft} drafts`} />
        <Stat label="Needs attention" value={String(c.inReview + c.low + c.out)} note={`${c.inReview} in review · ${c.low} low · ${c.out} out`} tone="warn" />
        <Stat label="Orders (demo)" value={String(orders.length)} note={Object.entries(byStatus).map(([k, v]) => `${k} ${v}`).join(" · ")} />
        <Stat label="Revenue (demo)" value={inr(revenue)} note="mock checkout totals" />
      </div>

      <Panel title="Quick actions">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quick.map((q) => (
            <Link key={q.label} to={q.to} className={q.primary ? btnSolid + " py-3.5" : btn + " py-3.5"}>{q.label}</Link>
          ))}
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Recent product changes" subtitle="Latest catalogue writes" action={<Link to="/admin/products" className="text-[11px] text-mocha underline">Manage</Link>}>
          <ul className="space-y-2">
            {productCatalog.recentChanges(6).map((p) => (
              <li key={p.id} className="flex items-center gap-3 border-b border-sand/60 pb-2 text-xs">
                <img src={p.images[0]} alt="" className="h-9 w-7 object-cover" loading="lazy" />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <span className="shrink-0 capitalize text-mutedbrown">{p.publication ?? "published"}</span>
                <span className="shrink-0 text-mutedbrown">{shortDate(p.updatedAt ?? p.createdAt)}</span>
                <Link to={`/admin/products/${p.id}/edit`} className="shrink-0 text-mocha underline underline-offset-4">Edit</Link>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Recent orders" subtitle="Demo orders" action={<Link to="/admin/orders" className="text-[11px] text-mocha underline">All orders</Link>}>
          <ul className="space-y-2">
            {orders.slice(0, 6).map((o) => (
              <li key={o.id} className="flex items-center gap-3 border-b border-sand/60 pb-2 text-xs">
                <span className="font-mono text-espresso">{o.reference}</span>
                <span className="min-w-0 flex-1 truncate text-warmgray">{o.address.fullName}</span>
                <span className="shrink-0">{inr(o.total)}</span>
                <span className="shrink-0 capitalize text-mutedbrown">{o.status}</span>
              </li>
            ))}
            {orders.length === 0 && <li className="text-xs text-mutedbrown">No orders yet in this browser.</li>}
          </ul>
        </Panel>
      </div>

      <Panel title="Audit trail" subtitle="Sensitive admin operations (demo log)">
        <ul className="max-h-52 space-y-1.5 overflow-y-auto text-xs">
          {audit.map((a) => (
            <li key={a.id} className="flex gap-3 border-b border-sand/50 pb-1.5">
              <span className="shrink-0 text-mutedbrown">{shortDate(a.at)}</span>
              <span className="shrink-0 font-mono text-[11px] text-espresso">{a.action}</span>
              <span className="text-warmgray">{a.detail}</span>
            </li>
          ))}
          {audit.length === 0 && <li className="text-mutedbrown">No admin actions recorded yet.</li>}
        </ul>
      </Panel>
    </div>
  );
}

/* -------------------------------- Inventory -------------------------------- */

export function AdminInventory() {
  const { toast } = useStore();
  const [, setTick] = useState(0);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out" | "healthy">("all");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [thresholds, setThresholds] = useState<Record<string, string>>({});

  const rows = productCatalog.all().filter((p) => {
    const avail = availabilityOf(p);
    return (
      (filter === "all" || (filter === "low" ? avail === "Low stock" : filter === "out" ? p.stock === 0 : avail === "In stock")) &&
      [p.name, p.sku, p.variety].join(" ").toLowerCase().includes(q.toLowerCase())
    );
  });

  const pendingAlerts = alertService.pending();

  const saveStock = (id: string) => {
    const n = Number(edits[id]);
    if (!Number.isInteger(n) || n < 0) { toast("Enter a valid stock quantity.", "error"); return; }
    const p = productCatalog.get(id);
    const before = pendingAlerts.filter((a) => a.productId === id).length;
    productCatalog.updateStock(id, n);
    toast(`“${p?.name}” stock → ${n}. Cache invalidated.${before && n > 0 ? ` ${before} back-in-stock alert(s) fulfilled (demo).` : ""}`);
    setEdits((e) => { const c = { ...e }; delete c[id]; return c; });
    setTick((t) => t + 1);
  };

  const saveThreshold = (id: string) => {
    const n = Number(thresholds[id]);
    if (!Number.isInteger(n) || n < 0) { toast("Threshold must be 0 or more.", "error"); return; }
    productCatalog.setThreshold(id, n);
    toast("Low-stock threshold updated.");
    setThresholds((e) => { const c = { ...e }; delete c[id]; return c; });
    setTick((t) => t + 1);
  };

  const units = productCatalog.all().reduce((a, p) => a + p.stock, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-darkroast">Inventory Management</h1>
        <p className="mt-1 text-xs text-mutedbrown">SKU-level stock with per-product low-stock thresholds. Saving invalidates product, listing and related cache keys.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Units on hand" value={String(units)} />
        <Stat label="Low stock" value={String(productCatalog.counts().low)} tone="warn" />
        <Stat label="Out of stock" value={String(productCatalog.counts().out)} tone="bad" />
        <Stat label="Pending stock alerts" value={String(pendingAlerts.length)} note="shopper back-in-stock requests" tone={pendingAlerts.length ? "warn" : "good"} />
      </div>

      <Panel
        title="Stock levels"
        action={
          <span className="flex gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" aria-label="Search inventory" className="border border-sand bg-white px-2.5 py-1.5 text-xs" />
            <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Availability filter" className="border border-sand bg-white px-2 py-1.5 text-xs">
              <option value="all">All</option><option value="low">Low stock</option><option value="out">Out of stock</option><option value="healthy">Healthy</option>
            </select>
          </span>
        }
      >
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="sticky top-0 bg-cream text-[10px] uppercase tracking-[0.12em] text-mutedbrown">
              <tr><th className="px-3 py-2.5 font-medium">Product / SKU</th><th className="px-3 py-2.5 font-medium">Availability</th><th className="px-3 py-2.5 font-medium">Stock</th><th className="px-3 py-2.5 font-medium">Threshold</th><th className="px-3 py-2.5 font-medium">Update</th></tr>
            </thead>
            <tbody className="divide-y divide-sand/70">
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2"><img src={p.images[0]} alt="" className="h-9 w-7 object-cover" loading="lazy" /><span><span className="block max-w-52 truncate font-medium">{p.name}</span><span className="font-mono text-[10px] text-mutedbrown">{p.sku} · {p.publication ?? "published"}</span></span></span>
                  </td>
                  <td className="px-3 py-2">{availabilityOf(p)}</td>
                  <td className="px-3 py-2">
                    <form onSubmit={(e) => { e.preventDefault(); saveStock(p.id); }} className="flex gap-1.5">
                      <input value={edits[p.id] ?? String(p.stock)} onChange={(e) => setEdits({ ...edits, [p.id]: e.target.value.replace(/\D/g, "") })} aria-label={`Stock for ${p.name}`} className="w-16 border border-sand px-2 py-1" />
                      <button className={btn}>Save</button>
                    </form>
                  </td>
                  <td className="px-3 py-2">
                    <form onSubmit={(e) => { e.preventDefault(); saveThreshold(p.id); }} className="flex gap-1.5">
                      <input value={thresholds[p.id] ?? String(p.lowStockThreshold ?? 3)} onChange={(e) => setThresholds({ ...thresholds, [p.id]: e.target.value.replace(/\D/g, "") })} aria-label={`Threshold for ${p.name}`} className="w-14 border border-sand px-2 py-1" />
                      <button className={btn}>Set</button>
                    </form>
                  </td>
                  <td className="px-3 py-2"><Link to={`/admin/products/${p.id}/edit`} className="text-mocha underline underline-offset-4">Edit product</Link></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-mutedbrown">No products match.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Back-in-stock requests" subtitle="Shopper alerts fulfilled automatically on restock (demo)">
        {pendingAlerts.length === 0 ? (
          <p className="text-xs text-mutedbrown">No pending alerts. Shoppers can request one on any out-of-stock product page.</p>
        ) : (
          <ul className="space-y-2">
            {pendingAlerts.map((a) => {
              const p = productCatalog.get(a.productId);
              return (
                <li key={a.id} className="flex flex-wrap items-center gap-3 border border-sand/70 p-3 text-xs">
                  <Bell className="h-4 w-4 text-mocha" aria-hidden />
                  <span className="min-w-0 flex-1">{a.email} → <strong>{p?.name ?? a.productId}</strong> <span className="text-mutedbrown">({shortDate(a.createdAt)})</span></span>
                  {p && p.stock <= 0 && <button onClick={() => { productCatalog.updateStock(p.id, (p.lowStockThreshold ?? 3) + 5); setTick((t) => t + 1); toast("Restocked — alert fulfilled (demo)."); }} className={btn}>Restock & notify</button>}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* --------------------------------- Content --------------------------------- */

export function AdminContent() {
  const { toast } = useStore();
  const [home, setHome] = useState<HomeContent>(() => contentService.home());
  const [banners, setBanners] = useState<Banner[]>(() => contentService.banners());
  const [editing, setEditing] = useState<Banner | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const saveHome = (e: FormEvent) => {
    e.preventDefault();
    contentService.saveHome(home);
    toast("Homepage copy updated — visible on next visit to Home.");
  };

  const saveBanner = (b: Banner) => {
    const next = editing ? banners.map((x) => (x.id === b.id ? b : x)) : [...banners, { ...b, id: `b-${Date.now().toString(36)}` }];
    setBanners(next);
    contentService.saveBanners(next);
    setEditing(null); setFormOpen(false);
    toast("Banners saved.");
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-darkroast">Content Management</h1>
        <p className="mt-1 text-xs text-mutedbrown">Homepage announcement, hero copy and promo banners. Heritage stories are curated in the catalogue for this demo.</p>
      </header>

      <Panel title="Homepage copy">
        <form onSubmit={saveHome} className="grid gap-4">
          <div>
            <label htmlFor="c-ann" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-warmgray">Announcement messages (one per line)</label>
            <textarea id="c-ann" rows={3} value={home.announcement.join("\n")} onChange={(e) => setHome({ ...home, announcement: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} className="w-full border border-sand bg-white px-3 py-2.5 text-sm" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="c-ta" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-warmgray">Hero title — line 1</label>
              <input id="c-ta" value={home.heroTitleA} onChange={(e) => setHome({ ...home, heroTitleA: e.target.value })} className="w-full border border-sand bg-white px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label htmlFor="c-tb" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-warmgray">Hero title — line 2</label>
              <input id="c-tb" value={home.heroTitleB} onChange={(e) => setHome({ ...home, heroTitleB: e.target.value })} className="w-full border border-sand bg-white px-3 py-2.5 text-sm" />
            </div>
          </div>
          <div>
            <label htmlFor="c-sub" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-warmgray">Hero subtitle</label>
            <textarea id="c-sub" rows={2} value={home.heroSubtitle} onChange={(e) => setHome({ ...home, heroSubtitle: e.target.value })} className="w-full border border-sand bg-white px-3 py-2.5 text-sm" />
          </div>
          <div><button className={btnSolid}><Save className="h-3.5 w-3.5" aria-hidden /> Save homepage copy</button></div>
        </form>
      </Panel>

      <Panel title="Homepage banners" subtitle="Active banners render on Home below the hero" action={<button onClick={() => { setEditing(null); setFormOpen(true); }} className={btn}><Plus className="h-3.5 w-3.5" aria-hidden /> Add banner</button>}>
        <ul className="grid gap-4 md:grid-cols-2">
          {banners.map((b) => (
            <li key={b.id} className={cn("border bg-white", b.active ? "border-sand" : "border-dashed border-stone opacity-70")}>
              <img src={b.image} alt="" className="aspect-[21/9] w-full object-cover" loading="lazy" />
              <div className="flex items-center gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base text-darkroast">{b.title}</p>
                  <p className="truncate text-xs text-mutedbrown">{b.subtitle} → {b.to}</p>
                </div>
                <button onClick={() => { const next = banners.map((x) => (x.id === b.id ? { ...x, active: !x.active } : x)); setBanners(next); contentService.saveBanners(next); }} aria-pressed={b.active} aria-label={b.active ? "Deactivate" : "Activate"}
                  className={cn("border px-2.5 py-1.5 text-[11px]", b.active ? "border-olivesage text-olivesage" : "border-sand text-mutedbrown")}>
                  {b.active ? "Active" : "Hidden"}
                </button>
                <button onClick={() => { setEditing(b); setFormOpen(true); }} aria-label="Edit banner" className="p-1.5 text-mocha hover:text-espresso"><Eye className="h-4 w-4" aria-hidden /></button>
                <button onClick={() => { const next = banners.filter((x) => x.id !== b.id); setBanners(next); contentService.saveBanners(next); }} aria-label="Delete banner" className="p-1.5 text-mutedbrown hover:text-error"><Trash2 className="h-4 w-4" aria-hidden /></button>
              </div>
            </li>
          ))}
        </ul>
        {formOpen && <BannerForm initial={editing} onSave={saveBanner} onCancel={() => { setFormOpen(false); setEditing(null); }} />}
      </Panel>
    </div>
  );
}

function BannerForm({ initial, onSave, onCancel }: { initial: Banner | null; onSave: (b: Banner) => void; onCancel: () => void }) {
  const [b, setB] = useState<Banner>(initial ?? { id: "", title: "", subtitle: "", image: img(IMG.goldFabric, 1200, 500), to: "/shop", active: true });
  const [error, setError] = useState<string | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (b.title.trim().length < 3) { setError("Title must be at least 3 characters."); return; }
    if (!b.to.startsWith("/")) { setError("Link target must be an internal path starting with “/”."); return; }
    if (!b.image.trim()) { setError("An image URL is required."); return; }
    onSave({ ...b, title: b.title.trim(), subtitle: b.subtitle.trim() });
  };
  const samples = [IMG.bengaliBride, IMG.durgaPuja, IMG.goldFabric, IMG.keralaJasmine, IMG.patterned, IMG.warmGlow];
  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 border border-espresso/30 bg-cream/40 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={b.title} onChange={(e) => setB({ ...b, title: e.target.value })} placeholder="Title *" aria-label="Banner title" className="border border-sand bg-white px-3 py-2 text-sm" />
        <input value={b.subtitle} onChange={(e) => setB({ ...b, subtitle: e.target.value })} placeholder="Subtitle" aria-label="Banner subtitle" className="border border-sand bg-white px-3 py-2 text-sm" />
        <input value={b.to} onChange={(e) => setB({ ...b, to: e.target.value })} placeholder="/shop?occasion=Wedding" aria-label="Banner link target" className="border border-sand bg-white px-3 py-2 text-sm" />
        <input value={b.image} onChange={(e) => setB({ ...b, image: e.target.value })} placeholder="Image URL" aria-label="Banner image URL" className="border border-sand bg-white px-3 py-2 text-sm" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-[0.12em] text-mutedbrown">Samples:</span>
        {samples.map((id) => (
          <button key={id} type="button" onClick={() => setB({ ...b, image: img(id, 1200, 500) })} className={cn("border-2", b.image.includes(String(id)) ? "border-espresso" : "border-transparent")} aria-label={`Use sample image ${id}`}>
            <img src={img(id, 120, 54)} alt="" className="h-8 w-20 object-cover" loading="lazy" />
          </button>
        ))}
      </div>
      {b.image && <img src={b.image} alt="Banner preview" className="aspect-[21/9] w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.25"; }} />}
      {error && <p role="alert" className="text-xs text-error">{error}</p>}
      <div className="flex gap-2">
        <button className={btnSolid}><ImagePlus className="h-3.5 w-3.5" aria-hidden /> {initial ? "Save banner" : "Add banner"}</button>
        <button type="button" onClick={onCancel} className={btn}>Cancel</button>
      </div>
    </form>
  );
}

/* --------------------------------- Support --------------------------------- */

const RET_STYLE: Record<string, string> = {
  requested: "bg-warning/15 text-warmgray", approved: "bg-info/10 text-info", rejected: "bg-error/10 text-error", refunded: "bg-olivesage/15 text-olivesage",
};

export function AdminSupport() {
  const { toast } = useStore();
  const [, setTick] = useState(0);
  const list = returnService.list();
  const orders = orderService.history();

  const setStatus = (id: string, status: "approved" | "rejected" | "refunded") => {
    returnService.setStatus(id, status);
    if (status === "refunded") {
      // restock the returned items (demo)
      const req = returnService.list().find((r) => r.id === id);
      const order = req && orders.find((o) => o.reference === req.orderRef);
      order?.items.forEach((i) => {
        const p = productCatalog.get(i.productId);
        if (p) productCatalog.updateStock(p.id, p.stock + i.quantity);
      });
      toast("Marked refunded — items restocked (demo).");
    } else {
      toast(`Return ${status}.`);
    }
    setTick((t) => t + 1);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-darkroast">Returns & Support</h1>
        <p className="mt-1 text-xs text-mutedbrown">Customer return requests with approve / reject / refund workflow. Refunds restock items in this demo.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Requests" value={String(list.length)} />
        <Stat label="Awaiting review" value={String(list.filter((r) => r.status === "requested").length)} tone="warn" />
        <Stat label="Approved" value={String(list.filter((r) => r.status === "approved").length)} />
        <Stat label="Refunded" value={String(list.filter((r) => r.status === "refunded").length)} tone="good" />
      </div>
      <Panel title="Return requests">
        {list.length === 0 ? (
          <p className="flex items-center gap-2 py-6 text-sm text-mutedbrown"><AlertTriangle className="h-4 w-4" aria-hidden /> No requests yet — customers can file one from Account → Returns.</p>
        ) : (
          <ul className="space-y-3">
            {list.map((r) => (
              <li key={r.id} className="border border-sand bg-white p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-espresso">{r.orderRef} <span className="font-sans text-mutedbrown">· {r.email} · {shortDate(r.createdAt)}</span></p>
                    <p className="mt-1 text-sm text-darkroast">{r.reason}</p>
                    <p className="text-xs text-warmgray">{r.details}</p>
                  </div>
                  <span className={cn("px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em]", RET_STYLE[r.status])}>{r.status}</span>
                </div>
                {r.status === "requested" && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => setStatus(r.id, "approved")} className={btn}><Check className="h-3.5 w-3.5" aria-hidden /> Approve</button>
                    <button onClick={() => setStatus(r.id, "rejected")} className={btn}><X className="h-3.5 w-3.5" aria-hidden /> Reject</button>
                  </div>
                )}
                {r.status === "approved" && (
                  <button onClick={() => setStatus(r.id, "refunded")} className={`${btnSolid} mt-3`}>Mark refunded & restock</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="Policy" subtitle="What shoppers are promised">
        <ul className="list-disc space-y-1.5 pl-5 text-xs text-warmgray">
          <li>7-day returns on unworn pieces with tags intact (demo policy).</li>
          <li>Refunds are demo-only — no money moves in this prototype.</li>
          <li>Contact tickets from the storefront are demo confirmations; returns are the persisted support record.</li>
        </ul>
        <p className="mt-3 flex items-center gap-2 text-xs text-mutedbrown"><Package className="h-3.5 w-3.5" aria-hidden /> Track any order from the storefront Track page; support acts on the same records here.</p>
      </Panel>
    </div>
  );
}

export function AdminCustomersNote() {
  return (
    <Panel title="Customers">
      <p className="text-sm text-warmgray">Customer accounts are demo-local in this phase (stored per browser). Real customer management — profiles, addresses, order ownership — arrives with backend authentication. Admin accounts can never be created from customer registration.</p>
    </Panel>
  );
}
