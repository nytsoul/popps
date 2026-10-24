import { FABRICS, OCCASION_INFO, TECHNIQUE_GROUP, VARIETIES, ZONES } from "../data/catalogue";
import type { FilterKey, Product, ProductQuery, SortKey } from "../types";

export interface FilterDef {
  key: FilterKey;
  label: string;
  section: "Origin" | "Saree" | "Craft" | "Style" | "Shopping";
  get: (p: Product) => string[];
  /** Fixed option order; otherwise options come from the data. */
  order?: string[];
  display?: (v: string) => string;
}

export const availabilityOf = (p: Product) => (p.stock <= 0 ? "Out of stock" : p.stock <= 3 ? "Low stock" : "In stock");

export const FILTER_DEFS: FilterDef[] = [
  { key: "country", label: "Country", section: "Origin", get: (p) => [p.country] },
  { key: "zone", label: "Region", section: "Origin", get: (p) => [p.zone], order: ZONES },
  { key: "state", label: "State / Region", section: "Origin", get: (p) => [p.state] },
  { key: "kind", label: "Garment Type", section: "Saree", get: (p) => [p.kind], order: ["Saree", "Ensemble", "Related Drape"] },
  { key: "variety", label: "Saree Type", section: "Saree", get: (p) => [p.variety] },
  { key: "fabric", label: "Fabric", section: "Saree", get: (p) => [p.fabric], order: FABRICS.map((f) => f.name) },
  { key: "composition", label: "Composition", section: "Saree", get: (p) => [p.composition], order: ["Pure", "Blend", "Natural Fibre", "Art Silk / Synthetic"] },
  { key: "weave", label: "Weaving Technique", section: "Craft", get: (p) => p.techniques.filter((t) => TECHNIQUE_GROUP[t] === "Weave") },
  { key: "print", label: "Printing & Dyeing", section: "Craft", get: (p) => p.techniques.filter((t) => TECHNIQUE_GROUP[t] === "Print & Dye") },
  { key: "embellishment", label: "Embroidery & Surface", section: "Craft", get: (p) => p.techniques.filter((t) => TECHNIQUE_GROUP[t] === "Embroidery & Surface") },
  { key: "loom", label: "Loom", section: "Craft", get: (p) => [p.loom], order: ["Handloom", "Powerloom", "Machine-woven"] },
  { key: "occasion", label: "Occasion", section: "Style", get: (p) => p.occasion, order: OCCASION_INFO.map((o) => o.key), display: (v) => OCCASION_INFO.find((o) => o.key === v)?.label ?? v },
  { key: "colour", label: "Colour", section: "Style", get: (p) => p.colours },
  { key: "border", label: "Border", section: "Style", get: (p) => [p.border], order: ["Zari", "Temple", "Contrast", "Plain", "Embroidered"] },
  { key: "motif", label: "Motif", section: "Style", get: (p) => [p.motif] },
  { key: "weight", label: "Weight", section: "Style", get: (p) => [p.weight], order: ["Lightweight", "Medium", "Heavy"] },
  { key: "availability", label: "Availability", section: "Shopping", get: (p) => [availabilityOf(p)], order: ["In stock", "Low stock", "Out of stock"] },
  {
    key: "collection", label: "Collection", section: "Shopping",
    get: (p) => [...p.collections, ...(p.isNew ? ["New Arrivals"] : []), ...(p.bestseller ? ["Bestsellers"] : []), ...(p.originalPrice && p.originalPrice > p.price ? ["On Sale"] : []), ...(p.originVerified ? ["Origin Verified"] : [])],
  },
  { key: "artisan", label: "Artisan / Cluster", section: "Shopping", get: (p) => [p.artisan] },
  { key: "care", label: "Care", section: "Shopping", get: (p) => [p.care], order: ["Dry clean", "Hand wash", "Machine washable"] },
  { key: "certification", label: "Certification", section: "Shopping", get: (p) => p.originVerified ? ["Origin Verified"] : ["Unverified"], order: ["Origin Verified", "Unverified"] },
];

export const FILTER_KEYS = FILTER_DEFS.map((f) => f.key);
export const filterDef = (k: FilterKey) => FILTER_DEFS.find((f) => f.key === k)!;

export const PRICE_BANDS = [
  { label: "Under ₹1,000", min: 0, max: 999 },
  { label: "₹1,000 – ₹2,500", min: 1000, max: 2500 },
  { label: "₹2,500 – ₹5,000", min: 2500, max: 5000 },
  { label: "₹5,000 – ₹10,000", min: 5000, max: 10000 },
  { label: "Above ₹10,000", min: 10000, max: 1_000_000 },
];

/* ------------------------------- search ------------------------------- */

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const haystack = (p: Product) =>
  norm([p.name, p.description, p.fabricDetail, p.motif, p.border, ...p.tags].join(" "));

function levenshtein(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

/** Vocabulary for spelling-tolerant suggestions. */
export const VOCAB: string[] = [...new Set([
  ...VARIETIES.flatMap((v) => [v.name, ...v.aliases, v.state, v.country]),
  ...FABRICS.map((f) => f.name),
  ...Object.keys(TECHNIQUE_GROUP),
  ...OCCASION_INFO.map((o) => o.key),
  "Red", "Maroon", "Pink", "Blue", "Green", "Yellow", "Purple", "Black", "White", "Ivory", "Beige", "Gold",
  "saree", "silk", "cotton", "bridal", "wedding", "zari", "handloom",
])];

const WORDS = [...new Set(VOCAB.flatMap((v) => norm(v).split(/[\s/&-]+/)).filter((w) => w.length > 2))];

/** Correct each token to the nearest known word when it has no direct match. */
export function didYouMean(q: string): string | undefined {
  const tokens = norm(q).split(/\s+/).filter(Boolean);
  let changed = false;
  const fixed = tokens.map((t) => {
    if (t.length < 3 || WORDS.includes(t) || WORDS.some((w) => w.startsWith(t))) return t;
    let best = t, bestD = Infinity;
    for (const w of WORDS) {
      const d = levenshtein(t, w);
      if (d < bestD) { bestD = d; best = w; }
    }
    const limit = t.length <= 5 ? 1 : 2;
    if (bestD <= limit) { changed = true; return best; }
    return t;
  });
  return changed ? fixed.join(" ") : undefined;
}

export function matchesQuery(p: Product, q: string) {
  const tokens = norm(q).split(/\s+/).filter(Boolean).filter((t) => !["saree", "sarees", "sari"].includes(t) || norm(q).trim() === t);
  if (!tokens.length) return true;
  const hay = haystack(p);
  return tokens.every((t) => hay.includes(t));
}

/* ------------------------------- engine ------------------------------- */

function matchesFilters(p: Product, filters: ProductQuery["filters"], skip?: FilterKey) {
  if (!filters) return true;
  for (const [k, values] of Object.entries(filters) as [FilterKey, string[]][]) {
    if (k === skip || !values?.length) continue;
    const got = filterDef(k).get(p);
    if (!values.some((v) => got.includes(v))) return false;
  }
  return true;
}

const score = (p: Product) =>
  (p.bestseller ? 3 : 0) + (p.originVerified ? 1 : 0) + (p.isNew ? 0.5 : 0) + p.rating * Math.log10(p.reviews + 10) - (p.stock <= 0 ? 5 : 0);

export function sortProducts(list: Product[], sort: SortKey = "recommended") {
  const items = [...list];
  switch (sort) {
    case "newest": return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case "price-asc": return items.sort((a, b) => a.price - b.price);
    case "price-desc": return items.sort((a, b) => b.price - a.price);
    case "popularity": return items.sort((a, b) => b.reviews - a.reviews);
    case "rating": return items.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
    default: return items.sort((a, b) => score(b) - score(a));
  }
}

export function runQuery(all: Product[], q: ProductQuery) {
  const inPrice = (p: Product) => (q.minPrice == null || p.price >= q.minPrice) && (q.maxPrice == null || p.price <= q.maxPrice);
  // Draft / in-review / archived products stay hidden from public browsing unless explicitly included.
  const visible = q.includeUnpublished ? all : all.filter((p) => (p.publication ?? "published") === "published");
  const base = visible.filter((p) => inPrice(p) && (!q.q || matchesQuery(p, q.q)));
  const results = base.filter((p) => matchesFilters(p, q.filters));

  // Facets: counts for each dimension, ignoring that dimension's own selection.
  const facets: Partial<Record<FilterKey, Record<string, number>>> = {};
  for (const def of FILTER_DEFS) {
    const counts: Record<string, number> = {};
    for (const p of base) {
      if (!matchesFilters(p, q.filters, def.key)) continue;
      for (const v of def.get(p)) counts[v] = (counts[v] ?? 0) + 1;
    }
    facets[def.key] = counts;
  }

  const sorted = sortProducts(results, q.sort);
  const page = q.page ?? 1;
  const pageSize = q.pageSize ?? 12;
  return {
    items: sorted.slice(0, page * pageSize), // cumulative — supports "load more"
    total: sorted.length,
    page, pageSize, facets,
    suggestion: sorted.length === 0 && q.q ? didYouMean(q.q) : undefined,
  };
}