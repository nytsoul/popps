import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, ChevronDown, Info, Loader2, Search, Share2, SlidersHorizontal, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ProductGrid } from "../components/products/collections";
import { Breadcrumbs, EmptyState, ErrorState, RateLimitNotice } from "../components/ui";
import { occasionLabel, regionByName, varietyByName } from "../data/catalogue";
import { useStore } from "../hooks/useStore";
import { inr } from "../lib/format";
import { productService, shortLinkService } from "../services";
import { ApiError } from "../services/api";
import { FILTER_DEFS, FILTER_KEYS, PRICE_BANDS, filterDef, type FilterDef } from "../services/filters";
import type { FilterKey, Paged, Product, SortKey } from "../types";
import { cn } from "../utils/cn";

const PAGE_SIZE = 12;
const SECTIONS: FilterDef["section"][] = ["Origin", "Saree", "Craft", "Style", "Shopping"];
const DEFAULT_OPEN: FilterKey[] = ["zone", "state", "fabric", "weave", "occasion", "colour"];

function FilterSection({ def, selected, counts, onToggle }: { def: FilterDef; selected: string[]; counts: Record<string, number>; onToggle: (v: string) => void }) {
  const [open, setOpen] = useState(DEFAULT_OPEN.includes(def.key) || selected.length > 0);
  const [more, setMore] = useState(false);
  const [find, setFind] = useState("");
  const options = useMemo(() => {
    const keys = new Set([...Object.keys(counts).filter((k) => counts[k] > 0), ...selected]);
    const list = def.order ? def.order.filter((o) => keys.has(o)) : [...keys].sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0) || a.localeCompare(b));
    return find ? list.filter((o) => o.toLowerCase().includes(find.toLowerCase())) : list;
  }, [counts, selected, def, find]);
  if (options.length === 0 && !find) return null;
  const visible = more ? options : options.slice(0, 7);
  const label = (v: string) => def.display?.(v) ?? v;

  return (
    <fieldset className="border-b border-sand py-4">
      <legend className="sr-only">{def.label}</legend>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between text-left">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-darkroast">
          {def.label} {selected.length > 0 && <span className="ml-1 rounded-full bg-espresso px-1.5 py-0.5 text-[9px] text-cream">{selected.length}</span>}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-mutedbrown transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div className="mt-3 space-y-1.5">
          {options.length > 9 && (
            <input value={find} onChange={(e) => setFind(e.target.value)} placeholder={`Find ${def.label.toLowerCase()}…`} aria-label={`Filter ${def.label} options`}
              className="mb-2 w-full border border-sand bg-white px-2.5 py-1.5 text-xs focus:border-mocha focus:outline-none" />
          )}
          {visible.map((o) => (
            <label key={o} className="flex cursor-pointer items-center gap-2.5 text-[13px] text-warmgray hover:text-darkroast">
              <input type="checkbox" checked={selected.includes(o)} onChange={() => onToggle(o)} className="h-4 w-4 shrink-0 accent-espresso" />
              <span className="flex-1 truncate">{label(o)}</span>
              <span className="text-[11px] text-stone">{counts[o] ?? 0}</span>
            </label>
          ))}
          {options.length > 7 && (
            <button type="button" onClick={() => setMore((m) => !m)} className="pt-1 text-xs font-medium text-mocha underline underline-offset-4">
              {more ? "Show less" : `Show all ${options.length}`}
            </button>
          )}
        </div>
      )}
    </fieldset>
  );
}

export default function Shop({ mode = "shop" }: { mode?: "shop" | "search" }) {
  const [params, setParams] = useSearchParams();
  const { toast } = useStore();
  const q = params.get("q") ?? "";
  const sort = (params.get("sort") as SortKey) || "recommended";
  const minPrice = params.get("min") ? Number(params.get("min")) : undefined;
  const maxPrice = params.get("max") ? Number(params.get("max")) : undefined;
  const title = params.get("title");
  const filters = useMemo(() => {
    const f: Partial<Record<FilterKey, string[]>> = {};
    for (const k of FILTER_KEYS) { const v = params.getAll(k); if (v.length) f[k] = v; }
    return f;
  }, [params]);

  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paged<Product> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<{ message: string; retryAfter?: number; status: number } | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [searchInput, setSearchInput] = useState(q);
  const [customMin, setCustomMin] = useState(minPrice?.toString() ?? "");
  const [customMax, setCustomMax] = useState(maxPrice?.toString() ?? "");
  const [sharing, setSharing] = useState(false);

  useEffect(() => setSearchInput(q), [q]);
  const key = params.toString();

  const fetchPage = useCallback(async (p: number) => {
    p === 1 ? setLoading(true) : setLoadingMore(true);
    setError(null);
    try {
      const res = await productService.list({ q: q || undefined, filters, minPrice, maxPrice, sort, page: p, pageSize: PAGE_SIZE });
      setResult(res);
      setPage(p);
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError({ status: 500, message: "Something went wrong while loading sarees." });
      setError({ message: err.message, retryAfter: err.retryAfter, status: err.status });
    } finally {
      setLoading(false); setLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => { fetchPage(1); }, [fetchPage]);
  useEffect(() => { document.body.style.overflow = drawer ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [drawer]);

  const update = (mutate: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(params);
    mutate(next);
    setParams(next, { replace: true });
  };
  const toggle = (k: FilterKey, v: string) => update((p) => {
    const vals = p.getAll(k);
    p.delete(k);
    (vals.includes(v) ? vals.filter((x) => x !== v) : [...vals, v]).forEach((x) => p.append(k, x));
  });
  const clearAll = () => { setParams(new URLSearchParams(mode === "search" && q ? { q } : {}), { replace: true }); setCustomMin(""); setCustomMax(""); };

  const chips: { label: string; remove: () => void }[] = [
    ...(Object.entries(filters) as [FilterKey, string[]][]).flatMap(([k, vals]) => vals.map((v) => ({ label: `${filterDef(k).label}: ${filterDef(k).display?.(v) ?? v}`, remove: () => toggle(k, v) }))),
    ...(minPrice != null || maxPrice != null ? [{ label: `Price: ${inr(minPrice ?? 0)} – ${maxPrice && maxPrice < 1_000_000 ? inr(maxPrice) : "any"}`, remove: () => update((p) => { p.delete("min"); p.delete("max"); }) }] : []),
    ...(q && mode === "shop" ? [{ label: `Search: “${q}”`, remove: () => update((p) => p.delete("q")) }] : []),
  ];

  /* Heritage context header */
  const singleVariety = filters.variety?.length === 1 ? varietyByName(filters.variety[0]) : undefined;
  const singleState = !singleVariety && filters.state?.length === 1 ? regionByName(filters.state[0]) : undefined;
  const heading = mode === "search" ? (q ? `Results for “${q}”` : "Search")
    : title ?? singleVariety?.name ?? singleState?.tradition
    ?? (filters.occasion?.length === 1 ? occasionLabel(filters.occasion[0]) : undefined)
    ?? (filters.fabric?.length === 1 ? `${filters.fabric[0]} Sarees` : undefined)
    ?? (filters.collection?.length === 1 ? filters.collection[0] : undefined)
    ?? (filters.country?.length === 1 ? `${filters.country[0]}` : undefined)
    ?? "Shop All Sarees";
  const description = singleVariety?.blurb ?? singleState?.story ?? (mode === "search" ? "Searching across names, regions, fabrics, techniques, occasions, colours and tags." : "Every piece in the ShopScale catalogue — filter by region, fabric, technique and more.");

  const share = async () => {
    setSharing(true);
    try {
      const link = await shortLinkService.create(`/${mode === "search" ? "search" : "shop"}?${key}`, heading);
      const url = shortLinkService.url(link.code);
      await navigator.clipboard?.writeText(url).catch(() => undefined);
      toast(`Short link ready: ${url}`);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't create a short link.", "error");
    } finally { setSharing(false); }
  };

  const panel = (
    <div>
      <div className="border-b border-sand pb-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-darkroast">Price</p>
        <div className="space-y-1.5">
          {PRICE_BANDS.map((b) => (
            <label key={b.label} className="flex cursor-pointer items-center gap-2.5 text-[13px] text-warmgray hover:text-darkroast">
              <input type="radio" name="price" checked={minPrice === b.min && maxPrice === b.max}
                onChange={() => { setCustomMin(String(b.min)); setCustomMax(b.max < 1_000_000 ? String(b.max) : ""); update((p) => { p.set("min", String(b.min)); p.set("max", String(b.max)); }); }}
                className="h-4 w-4 accent-espresso" />
              {b.label}
            </label>
          ))}
        </div>
        <form className="mt-3 flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); update((p) => { customMin ? p.set("min", customMin) : p.delete("min"); customMax ? p.set("max", customMax) : p.delete("max"); }); }}>
          <input value={customMin} onChange={(e) => setCustomMin(e.target.value.replace(/\D/g, ""))} placeholder="Min ₹" aria-label="Minimum price" className="w-full border border-sand bg-white px-2 py-1.5 text-xs" />
          <span className="text-stone">–</span>
          <input value={customMax} onChange={(e) => setCustomMax(e.target.value.replace(/\D/g, ""))} placeholder="Max ₹" aria-label="Maximum price" className="w-full border border-sand bg-white px-2 py-1.5 text-xs" />
          <button type="submit" className="border border-espresso px-2.5 py-1.5 text-xs text-espresso hover:bg-espresso hover:text-cream">Go</button>
        </form>
      </div>
      {SECTIONS.map((section) => (
        <div key={section}>
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.26em] text-mocha">{section}</p>
          {FILTER_DEFS.filter((d) => d.section === section).map((d) => (
            <FilterSection key={d.key} def={d} selected={filters[d.key] ?? []} counts={result?.facets[d.key] ?? {}} onToggle={(v) => toggle(d.key, v)} />
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 lg:px-6 lg:py-10">
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: mode === "search" ? "Search" : "Shop", to: mode === "search" ? undefined : "/shop" }, ...(mode === "shop" && heading !== "Shop All Sarees" ? [{ label: heading }] : [])]} />

      <header className="mb-8 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-3xl">
          {singleVariety && (
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-mutedbrown">
              <span>{singleVariety.state}{singleVariety.country !== "India" && singleVariety.state !== singleVariety.country ? `, ${singleVariety.country}` : ""} · {singleVariety.zone}</span>
              {singleVariety.status === "inspired"
                ? <span className="border border-gold/60 bg-gold/10 px-2 py-0.5 text-darkroast">Contemporary adaptation</span>
                : <span className="flex items-center gap-1 border border-olivesage/40 bg-olivesage/10 px-2 py-0.5 text-olivesage"><BadgeCheck className="h-3 w-3" aria-hidden /> Established tradition</span>}
              {singleVariety.kind !== "Saree" && <span className="border border-terracotta/50 bg-terracotta/10 px-2 py-0.5 text-terracotta">{singleVariety.kind} — not a saree</span>}
            </div>
          )}
          <h1 className="font-display text-4xl text-darkroast md:text-5xl">{heading}</h1>
          <p className="mt-3 text-sm leading-relaxed text-warmgray">{description}</p>
          {singleVariety?.aliases.length ? <p className="mt-1 text-xs text-mutedbrown">Also known as: {singleVariety.aliases.join(", ")}</p> : null}
        </div>
        <button onClick={share} disabled={sharing} className="inline-flex items-center gap-2 self-start text-xs font-medium uppercase tracking-[0.14em] text-mocha hover:text-espresso disabled:opacity-60 lg:self-end">
          {sharing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Share2 className="h-4 w-4" aria-hidden />} Share this collection
        </button>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <form onSubmit={(e) => { e.preventDefault(); update((p) => { p.delete("title"); searchInput.trim() ? p.set("q", searchInput.trim()) : p.delete("q"); }); }}
          className="flex min-w-0 flex-1 items-center gap-2 border border-sand bg-white px-3.5 py-2.5 focus-within:border-mocha sm:max-w-md" role="search">
          <Search className="h-4 w-4 shrink-0 text-mutedbrown" aria-hidden />
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search by name, region, fabric, colour…" aria-label="Search sarees" className="w-full bg-transparent text-sm focus:outline-none" />
        </form>
        <button onClick={() => setDrawer(true)} className="inline-flex items-center gap-2 border border-sand bg-white px-4 py-2.5 text-xs font-medium uppercase tracking-[0.12em] text-darkroast lg:hidden">
          <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filters {chips.length > 0 && `(${chips.length})`}
        </button>
        <label className="ml-auto flex items-center gap-2 text-xs text-warmgray">
          <span className="hidden sm:inline">Sort by</span>
          <select value={sort} onChange={(e) => update((p) => p.set("sort", e.target.value))} className="border border-sand bg-white px-3 py-2.5 text-xs text-darkroast focus:border-mocha focus:outline-none">
            <option value="recommended">Recommended</option>
            <option value="newest">Newest</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="popularity">Popularity</option>
            <option value="rating">Customer Rating</option>
          </select>
        </label>
      </div>

      {chips.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <button key={c.label} onClick={c.remove} className="inline-flex items-center gap-1.5 border border-latte/60 bg-ivory px-2.5 py-1 text-xs text-darkroast hover:border-espresso">
              {c.label} <X className="h-3 w-3" aria-label="Remove filter" />
            </button>
          ))}
          <button onClick={clearAll} className="text-xs font-medium text-terracotta underline underline-offset-4">Clear all</button>
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block" aria-label="Product filters">
          <div className="no-scrollbar sticky top-40 max-h-[calc(100vh-11rem)] overflow-y-auto pr-2">{panel}</div>
        </aside>

        <div>
          <p className="mb-5 text-xs uppercase tracking-[0.14em] text-mutedbrown" aria-live="polite">
            {loading ? "Loading sarees…" : `${result?.total ?? 0} piece${result?.total === 1 ? "" : "s"} found`}
          </p>
          {error ? (
            error.status === 429 ? <RateLimitNotice retryAfter={error.retryAfter} onRetry={() => fetchPage(1)} /> : <ErrorState message={error.message} onRetry={() => fetchPage(1)} />
          ) : !loading && result && result.total === 0 ? (
            <div className="space-y-4">
              {result.suggestion && (
                <p className="text-sm text-warmgray">
                  Did you mean{" "}
                  <Link to={`/search?q=${encodeURIComponent(result.suggestion)}`} className="font-medium text-espresso underline underline-offset-4">{result.suggestion}</Link>?
                </p>
              )}
              {singleVariety && (
                <p className="flex items-start gap-2 border border-sand bg-ivory p-4 text-sm text-warmgray">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-mocha" aria-hidden />
                  {singleVariety.name} is part of our catalogue of traditions, but no pieces are listed yet. Explore related traditions from {singleVariety.state} below.
                </p>
              )}
              <EmptyState
                title="Nothing matches — yet"
                text="Try a different spelling, remove a filter or two, or explore the full catalogue of saree types."
                actionLabel="Clear all filters"
                onAction={clearAll}
              />
              {singleVariety && <Link to={`/shop?state=${encodeURIComponent(singleVariety.state)}`} className="inline-block text-sm text-espresso underline underline-offset-4">Shop {singleVariety.state} →</Link>}
            </div>
          ) : (
            <>
              <ProductGrid products={result?.items ?? []} loading={loading} cols={3} />
              {!loading && result && result.items.length < result.total && (
                <div className="mt-10 text-center">
                  <p className="mb-3 text-xs text-mutedbrown">Showing {result.items.length} of {result.total}</p>
                  <button onClick={() => fetchPage(page + 1)} disabled={loadingMore}
                    className="inline-flex items-center gap-2 border border-espresso px-10 py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-espresso transition-colors hover:bg-espresso hover:text-cream disabled:opacity-60">
                    {loadingMore && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Load more
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {drawer && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-darkroast/50 lg:hidden" onClick={() => setDrawer(false)} aria-hidden />
            <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "tween", duration: 0.28 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[88%] max-w-sm flex-col bg-ivory lg:hidden" role="dialog" aria-label="Filters">
              <div className="flex items-center justify-between border-b border-sand px-5 py-4">
                <h2 className="font-display text-xl text-darkroast">Filters</h2>
                <button onClick={() => setDrawer(false)} aria-label="Close filters" className="p-1"><X className="h-5 w-5" aria-hidden /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 pb-6">{panel}</div>
              <div className="grid grid-cols-2 gap-3 border-t border-sand p-4">
                <button onClick={clearAll} className="border border-espresso py-3 text-xs font-semibold uppercase tracking-[0.14em] text-espresso">Clear all</button>
                <button onClick={() => setDrawer(false)} className="bg-espresso py-3 text-xs font-semibold uppercase tracking-[0.14em] text-cream">Show {result?.total ?? 0}</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}