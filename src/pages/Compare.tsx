import { ArrowRight, Check, GitCompareArrows, ShoppingBag, X } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/ui";
import { useStore, productById } from "../hooks/useStore";
import { inr } from "../lib/format";
import { MAX_COMPARE } from "../services/catalog";
import type { Product } from "../types";
import { cn } from "../utils/cn";

function row(label: string, get: (p: Product) => React.ReactNode, products: Product[], highlight?: (prices: number[]) => number[]) {
  const best = highlight ? highlight(products.map((p) => p.price)) : [];
  return { label, vals: products.map(get), best };
}

/** Floating tray — mount once in the storefront layout. */
export function CompareTray() {
  const { compareIds, toggleCompare, clearCompare } = useStore();
  if (compareIds.length === 0) return null;
  const products = compareIds.map(productById).filter(Boolean) as Product[];
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-sand bg-ivory/95 shadow-lift backdrop-blur" role="region" aria-label="Compare tray">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 lg:px-6">
        <p className="hidden items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-espresso sm:flex">
          <GitCompareArrows className="h-4 w-4" aria-hidden /> Compare ({compareIds.length}/{MAX_COMPARE})
        </p>
        <div className="flex flex-1 gap-2 overflow-x-auto">
          {products.map((p) => (
            <span key={p.id} className="flex shrink-0 items-center gap-2 border border-sand bg-white py-1 pl-1 pr-2">
              <img src={p.images[0]} alt="" className="h-9 w-7 object-cover" />
              <span className="max-w-32 truncate text-xs">{p.name}</span>
              <button onClick={() => toggleCompare(p)} aria-label={`Remove ${p.name} from compare`} className="text-mutedbrown hover:text-error">
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </span>
          ))}
        </div>
        <button onClick={clearCompare} className="shrink-0 text-xs text-mutedbrown underline underline-offset-4">Clear</button>
        <Link
          to="/compare"
          className={cn("shrink-0 bg-espresso px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-cream", compareIds.length < 2 && "pointer-events-none opacity-50")}
          aria-disabled={compareIds.length < 2}
        >
          Compare now
        </Link>
      </div>
    </div>
  );
}

export default function ComparePage() {
  const { compareIds, toggleCompare, clearCompare, addToCart } = useStore();
  const products = compareIds.map(productById).filter(Boolean) as Product[];

  if (products.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20">
        <EmptyState
          icon={<GitCompareArrows className="h-6 w-6" aria-hidden />}
          title="Nothing to compare"
          text="Add up to three sarees from any product page to compare price, fabric, weave, care and more side by side."
          actionLabel="Browse Sarees" actionTo="/shop"
        />
      </div>
    );
  }

  const rows = [
    row("Price", (p) => inr(p.price), products, (nums) => {
      const min = Math.min(...nums);
      return nums.map((n) => (n === min ? 0 : -1));
    }),
    row("Original price", (p) => (p.originalPrice ? inr(p.originalPrice) : "—"), products),
    row("Region of origin", (p) => `${p.state}${p.country !== "India" && p.state !== p.country ? `, ${p.country}` : ""}`, products),
    row("Saree type", (p) => p.variety, products),
    row("Fabric composition", (p) => p.fabricDetail, products),
    row("Composition class", (p) => p.composition, products),
    row("Weaving technique", (p) => p.techniques.join(", "), products),
    row("Loom", (p) => p.loom, products),
    row("Colour", (p) => p.colours.join(", "), products),
    row("Border & pallu", (p) => `${p.border} border · ${p.pallu}`, products),
    row("Motif", (p) => p.motif, products),
    row("Occasion", (p) => p.occasion.join(", "), products),
    row("Weight", (p) => `${p.weight}${p.weightG ? ` · approx. ${p.weightG} g` : ""}`, products),
    row("Blouse piece", (p) => (p.blousePiece == null ? "To be confirmed" : p.blousePiece ? "Included (unstitched)" : "Not included"), products),
    row("Care", (p) => p.care, products),
    row("Certification", (p) => (p.originVerified ? "Origin verified" : "Unverified"), products),
    row("Rating", (p) => (p.rating > 0 ? `${p.rating} ★ (${p.reviews} reviews)` : "No ratings yet"), products),
    row("Availability", (p) => (p.stock <= 0 ? "Out of stock" : p.stock <= (p.lowStockThreshold ?? 3) ? `Low stock (${p.stock})` : `In stock (${p.stock})`), products),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6 lg:py-14">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Side by Side</p>
          <h1 className="mt-2 font-display text-4xl text-darkroast">Compare Sarees</h1>
        </div>
        <button onClick={clearCompare} className="text-xs text-mutedbrown underline underline-offset-4">Clear all</button>
      </div>

      {/* Desktop table */}
      <div className="mt-8 hidden overflow-x-auto border border-sand bg-ivory md:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-sand">
              <th className="w-44 p-4 align-bottom text-xs font-semibold uppercase tracking-[0.14em] text-mutedbrown">Attribute</th>
              {products.map((p) => (
                <th key={p.id} className="min-w-52 p-4 align-top">
                  <div className="relative">
                    <button onClick={() => toggleCompare(p)} aria-label={`Remove ${p.name}`} className="absolute right-0 top-0 p-1 text-mutedbrown hover:text-error"><X className="h-4 w-4" aria-hidden /></button>
                    <Link to={`/product/${p.slug}`}><img src={p.images[0]} alt={p.name} className="aspect-[3/4] w-full object-cover" loading="lazy" /></Link>
                    <Link to={`/product/${p.slug}`} className="mt-2 block font-display text-base leading-snug text-darkroast hover:text-espresso">{p.name}</Link>
                    <p className="text-xs text-mutedbrown">{p.variety} · {p.state}</p>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => addToCart(p)} disabled={p.stock <= 0} className="flex flex-1 items-center justify-center gap-1.5 bg-espresso py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-cream hover:bg-mocha disabled:opacity-50">
                        <ShoppingBag className="h-3.5 w-3.5" aria-hidden /> Add
                      </button>
                      <Link to={`/product/${p.slug}`} className="flex items-center border border-espresso px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-espresso hover:bg-espresso hover:text-cream">
                        Details <ArrowRight className="ml-1 h-3 w-3" aria-hidden />
                      </Link>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.label} className={i % 2 ? "bg-cream/50" : ""}>
                <th scope="row" className="p-4 align-top text-xs font-semibold uppercase tracking-[0.1em] text-warmgray">{r.label}</th>
                {r.vals.map((v, j) => (
                  <td key={j} className="p-4 align-top text-[13px] leading-relaxed text-darkroast">
                    <span className="inline-flex items-start gap-1.5">
                      {r.best[j] === 0 && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-olivesage" aria-label="Best value" />}
                      {v}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="mt-8 space-y-5 md:hidden">
        {products.map((p) => (
          <article key={p.id} className="border border-sand bg-ivory">
            <div className="flex gap-4 p-4">
              <Link to={`/product/${p.slug}`} className="shrink-0"><img src={p.images[0]} alt={p.name} className="h-36 w-28 object-cover" /></Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-lg leading-snug text-darkroast">{p.name}</p>
                    <p className="text-xs text-mutedbrown">{p.variety} · {p.state}</p>
                  </div>
                  <button onClick={() => toggleCompare(p)} aria-label={`Remove ${p.name}`} className="p-1 text-mutedbrown"><X className="h-4 w-4" aria-hidden /></button>
                </div>
                <p className="mt-1 text-base font-semibold">{inr(p.price)}</p>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => addToCart(p)} disabled={p.stock <= 0} className="flex-1 bg-espresso py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-cream disabled:opacity-50">Add to bag</button>
                  <Link to={`/product/${p.slug}`} className="border border-espresso px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-espresso">Details</Link>
                </div>
              </div>
            </div>
            <dl className="divide-y divide-sand/70 border-t border-sand">
              {rows.map((r) => (
                <div key={r.label} className="grid grid-cols-[130px_1fr] gap-2 px-4 py-2.5 text-[13px]">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-mutedbrown">{r.label}</dt>
                  <dd className="text-darkroast">{r.vals[products.indexOf(p)]}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
      <p className="mt-6 text-[11px] text-mutedbrown">Prices, ratings and stock may change. The ✓ marks the lowest price.</p>
    </div>
  );
}
