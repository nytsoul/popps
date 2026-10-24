import { ArrowUpDown, Download, Eye, FileUp, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ZONES } from "../../data/catalogue";
import { useStore } from "../../hooks/useStore";
import { inr, shortDate } from "../../lib/format";
import { auditService, productCatalog } from "../../services/catalog";
import type { Product, PublicationStatus } from "../../types";
import { cn } from "../../utils/cn";
import { Panel, Stat, btn, btnSolid } from "./AdminLayout";

const PUB_STYLE: Record<PublicationStatus, string> = {
  published: "bg-olivesage/15 text-olivesage",
  draft: "bg-sand text-warmgray",
  "in-review": "bg-warning/15 text-warmgray",
  archived: "bg-error/10 text-error",
};

type Sort = "updated" | "name" | "price-asc" | "price-desc" | "stock";
const PAGE_SIZE = 12;

export default function AdminProducts() {
  const { toast } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | PublicationStatus>("all");
  const [zone, setZone] = useState("All");
  const [sort, setSort] = useState<Sort>("updated");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [tick, setTick] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);
  const [csvReport, setCsvReport] = useState<{ created: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  void tick;

  const all = useMemo(() => productCatalog.all(), [tick, q, status, zone, sort, page, selected.length, csvReport]);
  const counts = productCatalog.counts();

  const filtered = useMemo(() => {
    let list = all.filter(
      (p) =>
        (status === "all" || (p.publication ?? "published") === status) &&
        (zone === "All" || p.zone === zone) &&
        [p.name, p.sku, p.variety, p.state, p.fabric].join(" ").toLowerCase().includes(q.toLowerCase())
    );
    switch (sort) {
      case "name": list = [...list].sort((a, b) => a.name.localeCompare(b.name)); break;
      case "price-asc": list = [...list].sort((a, b) => a.price - b.price); break;
      case "price-desc": list = [...list].sort((a, b) => b.price - a.price); break;
      case "stock": list = [...list].sort((a, b) => a.stock - b.stock); break;
      default: list = [...list].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
    }
    return list;
  }, [all, q, status, zone, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const view = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageIds = view.map((p) => p.id);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const togglePage = () => setSelected((s) => (allChecked ? s.filter((id) => !pageIds.includes(id)) : [...new Set([...s, ...pageIds])]));

  const bulk = (st: PublicationStatus) => {
    const n = productCatalog.bulkSetStatus(selected, st);
    toast(`${n} product(s) → ${st}. Unpublished items are hidden from the storefront.`);
    setSelected([]);
    setTick((t) => t + 1);
  };

  const del = () => {
    if (!confirmDelete) return;
    productCatalog.remove(confirmDelete.id);
    toast(`${confirmDelete.name} deleted (demo).`, "info");
    setConfirmDelete(null);
    setSelected((s) => s.filter((id) => id !== confirmDelete.id));
    setTick((t) => t + 1);
  };

  const download = (text: string, name: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const text = await f.text();
    const report = productCatalog.importCSV(text);
    setCsvReport(report);
    toast(report.created ? `${report.created} product(s) imported as drafts.` : "Nothing imported — see row errors.", report.created ? "success" : "error");
    setTick((t) => t + 1);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-darkroast">Product Management</h1>
          <p className="mt-1 text-xs text-mutedbrown">Demo catalogue changes are local — published items appear in the storefront, drafts stay hidden.</p>
        </div>
        <button onClick={() => navigate("/admin/products/new")} className={btnSolid}>
          <Plus className="h-4 w-4" aria-hidden /> Add Saree
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <Stat label="Total" value={String(counts.total)} />
        <Stat label="Published" value={String(counts.published)} tone="good" />
        <Stat label="Drafts" value={String(counts.draft)} />
        <Stat label="In review" value={String(counts.inReview)} tone="warn" />
        <Stat label="Low stock" value={String(counts.low)} tone="warn" />
        <Stat label="Out of stock" value={String(counts.out)} tone="bad" />
      </div>

      <Panel
        title="Catalogue"
        subtitle="Search, filter, sort, select — then act in bulk"
        action={
          <span className="flex flex-wrap gap-2">
            <button onClick={() => download(productCatalog.exportCSV(), "shopscale-products.csv")} className={btn}>
              <Download className="h-3.5 w-3.5" aria-hidden /> Export CSV
            </button>
            <button onClick={() => fileRef.current?.click()} className={btn}>
              <FileUp className="h-3.5 w-3.5" aria-hidden /> Import CSV
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" aria-label="Import CSV file"
              onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
          </span>
        }
      >
        {csvReport && (
          <div className="mb-4 border border-sand bg-cream/50 p-4 text-xs" role="status">
            <p className="font-semibold text-darkroast">Import result: {csvReport.created} created, {csvReport.errors.length} row(s) rejected.</p>
            {csvReport.errors.length > 0 && (
              <ul className="mt-2 max-h-28 list-disc space-y-1 overflow-y-auto pl-5 text-error">
                {csvReport.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
            <p className="mt-2 text-mutedbrown">Expected columns: sku, name, variety, price, originalPrice, stock, publication, fabric, loom, state. Imported rows arrive as drafts with a placeholder image — complete them before publishing.</p>
            <button onClick={() => setCsvReport(null)} className="mt-2 underline underline-offset-4">Dismiss</button>
          </div>
        )}

        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="flex min-w-44 flex-1 items-center gap-2 border border-sand bg-white px-3 py-2">
            <Search className="h-3.5 w-3.5 text-mutedbrown" aria-hidden />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search name, SKU, variety…" aria-label="Search products" className="w-full bg-transparent text-xs focus:outline-none" />
          </div>
          <select value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }} aria-label="Publication status" className="border border-sand bg-white px-3 py-2 text-xs">
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="in-review">In Review</option>
            <option value="archived">Archived</option>
          </select>
          <select value={zone} onChange={(e) => { setZone(e.target.value); setPage(1); }} aria-label="Region" className="border border-sand bg-white px-3 py-2 text-xs">
            <option>All</option>{ZONES.map((z) => <option key={z}>{z}</option>)}
          </select>
          <button onClick={() => setSort((s) => (s === "updated" ? "name" : s === "name" ? "price-asc" : s === "price-asc" ? "price-desc" : s === "price-desc" ? "stock" : "updated"))}
            className="inline-flex items-center gap-1.5 border border-sand bg-white px-3 py-2 text-xs" aria-label="Change sort">
            <ArrowUpDown className="h-3.5 w-3.5" aria-hidden /> Sort: {sort}
          </button>
        </div>

        {selected.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 border border-espresso/30 bg-cream/60 p-3 text-xs" role="status">
            <strong>{selected.length} selected</strong>
            {(["published", "draft", "in-review", "archived"] as PublicationStatus[]).map((st) => (
              <button key={st} onClick={() => bulk(st)} className="border border-espresso px-2.5 py-1 capitalize hover:bg-espresso hover:text-cream">→ {st}</button>
            ))}
            <button onClick={() => setSelected([])} className="underline underline-offset-4">Clear</button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead className="text-[10px] uppercase tracking-[0.12em] text-mutedbrown">
              <tr>
                <th className="py-2 pr-2"><input type="checkbox" checked={allChecked} onChange={togglePage} aria-label="Select page" className="h-4 w-4 accent-espresso" /></th>
                {["Product", "SKU", "Variety", "Region", "Price", "Stock", "Status", "Updated", "Actions"].map((h) => <th key={h} className="px-2 py-2 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-sand/70">
              {view.map((p) => (
                <tr key={p.id} className={cn("hover:bg-cream/50", selected.includes(p.id) && "bg-cream/70")}>
                  <td className="py-2 pr-2"><input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} aria-label={`Select ${p.name}`} className="h-4 w-4 accent-espresso" /></td>
                  <td className="px-2 py-2">
                    <span className="flex items-center gap-2"><img src={p.images[0]} alt="" className="h-10 w-8 shrink-0 object-cover" loading="lazy" /><span className="max-w-48 truncate font-medium text-darkroast">{p.name}</span></span>
                  </td>
                  <td className="px-2 py-2 font-mono text-[11px]">{p.sku}</td>
                  <td className="px-2 py-2">{p.variety}</td>
                  <td className="px-2 py-2 text-warmgray">{p.state}</td>
                  <td className="px-2 py-2">{inr(p.price)}</td>
                  <td className="px-2 py-2"><span className={cn("px-2 py-0.5 text-[10px]", p.stock === 0 ? "bg-error/10 text-error" : p.stock <= (p.lowStockThreshold ?? 3) ? "bg-warning/15" : "bg-olivesage/15 text-olivesage")}>{p.stock}</span></td>
                  <td className="px-2 py-2"><span className={cn("px-2 py-0.5 text-[10px] font-medium capitalize", PUB_STYLE[p.publication ?? "published"])}>{p.publication ?? "published"}</span></td>
                  <td className="px-2 py-2 text-mutedbrown">{shortDate(p.updatedAt ?? p.createdAt)}</td>
                  <td className="px-2 py-2">
                    <span className="flex gap-1">
                      <Link to={`/admin/products/${p.id}/edit`} aria-label={`Edit ${p.name}`} title="Edit" className="p-1.5 text-mocha hover:bg-cream hover:text-espresso"><Pencil className="h-3.5 w-3.5" aria-hidden /></Link>
                      <Link to={`/product/${p.slug}`} aria-label={`Preview ${p.name}`} title="Preview in storefront" className="p-1.5 text-mocha hover:bg-cream hover:text-espresso"><Eye className="h-3.5 w-3.5" aria-hidden /></Link>
                      <button onClick={() => setConfirmDelete(p)} aria-label={`Delete ${p.name}`} title="Delete" className="p-1.5 text-mutedbrown hover:bg-error/10 hover:text-error"><Trash2 className="h-3.5 w-3.5" aria-hidden /></button>
                    </span>
                  </td>
                </tr>
              ))}
              {view.length === 0 && <tr><td colSpan={10} className="py-10 text-center text-mutedbrown">No products match these filters.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-mutedbrown">
          <span>Showing {view.length} of {filtered.length} · page {page} of {pages}</span>
          <span className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="border border-sand px-3 py-1.5 disabled:opacity-40">← Prev</button>
            <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="border border-sand px-3 py-1.5 disabled:opacity-40">Next →</button>
          </span>
        </div>
      </Panel>

      <Panel title="Recent product changes" subtitle="Audit trail (demo — local only)">
        <ul className="max-h-48 space-y-1.5 overflow-y-auto text-xs">
          {auditService.list().filter((a) => a.action.startsWith("product.") || a.action.startsWith("inventory.")).slice(0, 12).map((a) => (
            <li key={a.id} className="flex gap-3 border-b border-sand/50 pb-1.5">
              <span className="shrink-0 text-mutedbrown">{shortDate(a.at)}</span>
              <span className="font-mono text-[11px] text-espresso">{a.action}</span>
              <span className="text-warmgray">{a.detail}</span>
            </li>
          ))}
          {auditService.list().length === 0 && <li className="text-mutedbrown">No admin changes yet — create or edit a product to see the trail.</li>}
        </ul>
      </Panel>

      {confirmDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-darkroast/55 p-4" role="alertdialog" aria-modal="true" aria-label="Delete product">
          <div className="w-full max-w-sm border border-sand bg-ivory p-6">
            <h2 className="font-display text-xl text-darkroast">Delete “{confirmDelete.name}”?</h2>
            <p className="mt-2 text-sm text-warmgray">This removes it from the demo catalogue immediately. Seed products return on a fresh browser; custom products are gone for good.</p>
            <div className="mt-5 flex gap-3">
              <button onClick={del} className="flex-1 bg-error py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-ivory">Delete</button>
              <button onClick={() => setConfirmDelete(null)} className="flex-1 border border-sand py-2.5 text-xs uppercase tracking-[0.14em]">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
