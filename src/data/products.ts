import type {
  Badge, Border, CareType, Colour, Composition, CrawlRun, FabricFamily, JMeterSample, Loom, Motif, Occasion,
  Order, Product, PublicationStatus, Technique, Weight,
} from "../types";
import { IMG, img, slugify, varietyByName } from "./catalogue";

/* ---------------------------------------------------------------------------
   DEMO product catalogue. Prices, stock, ratings and discounts are sample data.
   Photography is representative styling imagery — not a photo of the exact piece.
--------------------------------------------------------------------------- */

interface Seed {
  v: string;           // variety name (must exist in catalogue)
  n: string;           // product name
  p: number;           // price
  o?: number;          // original price → sale
  c: Colour[];
  i?: number;          // primary image id
  imgUrl?: string;     // direct image URL (from dataset)
  f?: FabricFamily;
  fd?: string;
  comp?: Composition;
  loom?: Loom;
  motif?: Motif;
  border?: Border;
  w?: Weight;
  b?: Badge;
  s?: number;
  col?: string[];
  tech?: Technique[];
  occ?: Occasion[];
  ver?: boolean;
  nw?: boolean;
  bs?: boolean;
  len?: string;
  cv?: string[];
}

import importedSeeds from "./imported_seeds.json";
const SEEDS: Seed[] = (importedSeeds as unknown as Seed[]) ?? [];


/* ------------------------------- builder ------------------------------- */

const hash = (s: string) => [...s].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);

const TEXTURE: Record<FabricFamily, number> = {
  Silk: IMG.goldFabric, Tussar: IMG.brownPleat, Muga: IMG.goldSatin, Eri: IMG.beigeFold,
  Cotton: IMG.beigeCotton, Khadi: IMG.villageLoom, "Silk-Cotton": IMG.whiteFabric, Linen: IMG.beigeLinen,
  Organza: IMG.whiteFabric, Chiffon: IMG.blueFabric, Georgette: IMG.blueSequin, Crepe: IMG.brownPleat,
  Tissue: IMG.goldSatin, Blended: IMG.rolls,
};
const LOOMS = [IMG.loom, IMG.handLoom, IMG.weaving, IMG.threads, IMG.loom2];

const SILKY: FabricFamily[] = ["Silk", "Tussar", "Muga", "Eri", "Organza", "Tissue"];

const CARE_TEXT: Record<CareType, string> = {
  "Dry clean": "Dry clean only. Store folded in a muslin cloth away from direct sunlight; refold every few months to protect zari and creases.",
  "Hand wash": "Hand wash separately in cold water with a mild detergent. Dry in shade. Iron on medium heat on the reverse.",
  "Machine washable": "Gentle machine wash cold inside a laundry bag. Line dry in shade.",
};

const PALLU: Partial<Record<Technique, string>> = {
  Brocade: "Rich brocaded pallu with dense woven motifs",
  "Zari Work": "Zari-woven pallu with traditional patterning",
  Ikat: "Ikat pallu continuing the body's tie-dyed geometry",
  "Double Ikat": "Double-ikat pallu aligned warp-and-weft by hand",
  Jamdani: "Pallu with hand-inserted jamdani motifs",
  "Block Print": "Hand-block printed pallu",
  Bandhani: "Bandhani pallu with dense resist-dyed dots",
  Leheriya: "Wave-dyed leheriya pallu",
  Kantha: "Embroidered kantha pallu",
  Chikankari: "Chikankari-worked pallu",
};

function build(seed: Seed, idx: number): Product {
  const v = varietyByName(seed.v) ?? varietyByName("Unverified Saree") ?? {
    slug: "unverified-saree", name: "Unverified Saree", aliases: [], state: "India",
    country: "India" as const, zone: "Central India" as const, kind: "Saree" as const,
    status: "inspired" as const, fabrics: ["Silk" as const], techniques: ["Handloom" as const],
    occasions: ["Everyday" as const], blurb: "Contemporary or unverified saree awaiting provenance check."
  };
  const id = `p${String(idx + 1).padStart(3, "0")}`;
  const h = hash(seed.n);
  const fabric = seed.f ?? v.fabrics[0] ?? "Silk";
  const techniques = seed.tech ?? v.techniques ?? ["Handloom"];
  const composition: Composition =
    seed.comp ?? (["Cotton", "Linen", "Khadi"].includes(fabric) ? "Natural Fibre"
      : fabric === "Silk-Cotton" || fabric === "Blended" ? "Blend"
      : ["Chiffon", "Georgette", "Crepe"].includes(fabric) ? "Art Silk / Synthetic" : "Pure");
  const care: CareType = SILKY.includes(fabric) || techniques.includes("Zari Work") || seed.w === "Heavy" ? "Dry clean"
    : composition === "Art Silk / Synthetic" ? "Hand wash" : fabric === "Blended" ? "Machine washable" : "Hand wash";
  const loom: Loom = seed.loom ?? "Handloom";
  const primary = seed.imgUrl ? seed.imgUrl : (seed.i ? img(seed.i) : img(IMG.forest));
  const images = [primary];
  if (TEXTURE[fabric]) images.push(img(TEXTURE[fabric]));
  const imageCaptions = ["Styling reference", `${fabric} fabric detail`];
  if (loom === "Handloom") { images.push(img(LOOMS[h % LOOMS.length])); imageCaptions.push("On the loom"); }
  const isSaree = v.kind === "Saree";
  const pallu = techniques.map((t) => PALLU[t]).find(Boolean) ?? (isSaree ? "Pallu details to be confirmed by the weaver" : "Not applicable");
  const day = 1 + (h % 27);
  const month = 1 + (h % 12);
  const isNew = !!seed.nw;
  const createdAt = isNew ? `2026-0${1 + (h % 2)}-${String(day).padStart(2, "0")}` : `2025-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const stock = seed.s ?? (h % 9 === 0 ? 0 : 4 + (h % 22));
  const fabricDetail = seed.fd ?? (composition === "Pure" ? `Pure ${fabric.toLowerCase()}` : composition === "Natural Fibre" ? `Handloom ${fabric.toLowerCase()}` : fabric);
  const occasions = [...new Set([...v.occasions, ...(seed.occ ?? []), ...(seed.p >= 8000 ? (["Gifting"] as Occasion[]) : [])])];
  const collections = [...new Set([...(seed.col ?? []), ...(v.status === "inspired" ? ["Designer"] : [])])];
  return {
    id, slug: slugify(seed.n), name: seed.n,
    variety: v.name, varietySlug: v.slug, category: v.name,
    state: v.state, country: v.country, zone: v.zone, kind: v.kind, status: v.status,
    fabric, fabricDetail, composition, loom, techniques, occasion: occasions,
    colours: seed.c,
    colors: seed.cv ?? [seed.c.join(" & ")],
    motif: seed.motif ?? "Traditional", border: seed.border ?? "Plain", weight: seed.w ?? "Medium",
    care, careText: CARE_TEXT[care],
    price: seed.p, originalPrice: seed.o, badge: seed.b ?? (isNew ? "New Arrival" : undefined),
    rating: Math.round((4.2 + (h % 8) / 10) * 10) / 10,
    reviews: 8 + (h % 240),
    stock,
    images,
    imageCaptions,
    sku: `SS-${id.toUpperCase()}`,
    publication: "published" as PublicationStatus,
    lowStockThreshold: 3,
    weightG: wToG(seed.w),
    drape: undefined,
    giftEligible: true,
    updatedAt: createdAt,
    description: `${v.blurb} This ${seed.n.toLowerCase()} is woven in ${fabricDetail.toLowerCase()}${seed.motif ? ` with ${seed.motif.toLowerCase()} motifs` : ""} and a ${(seed.border ?? "plain").toLowerCase()} border.`,
    story: `${v.name} belongs to the weaving traditions of ${v.state}${v.country !== "India" ? `, ${v.country}` : ""}. ${v.status === "inspired" ? "This piece is a contemporary design inspired by the tradition, not a traditional variety in its own right." : "Pieces in this tradition are typically made in regional clusters by families of weavers."} Artisan attribution for this demo listing has not yet been verified.`,
    pallu,
    length: seed.len ?? (isSaree ? "5.5 m saree + 0.8 m unstitched blouse piece (demo spec)" : "Size not confirmed"),
    blousePiece: seed.len ? (seed.len.includes("not included") || !isSaree ? false : null) : isSaree ? true : null,
    artisan: `${v.state} weaving cluster (unverified)`,
    collections,
    originVerified: !!seed.ver,
    createdAt,
    bestseller: !!seed.bs,
    isNew,
    tags: [v.name, ...v.aliases, v.state, v.country, fabric, ...techniques, ...occasions, ...seed.c, seed.motif ?? "", ...collections].filter(Boolean),
  };
}

export const PRODUCTS: Product[] = SEEDS.map(build);

/* Admin-created demo products overlay (persisted in-browser; merged at load). */
export const CUSTOM_KEY = "shopscale.custom-products.v1";

function wToG(w?: Weight): number | null {
  if (w === "Lightweight") return 350;
  if (w === "Heavy") return 900;
  if (w === "Medium") return 600;
  return null;
}

function loadCustom(): Product[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Product[];
    return Array.isArray(arr) ? arr.filter((c) => c && c.id && c.slug) : [];
  } catch { return []; }
}

for (const c of loadCustom()) {
  if (!PRODUCTS.some((p) => p.id === c.id)) PRODUCTS.push(c);
}

/** Rewrite the whole custom-product overlay (used by the admin catalogue service). */
export function saveCustomProducts(list: Product[]) {
  try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

export function customProducts(): Product[] {
  const ids = new Set(loadCustom().map((c) => c.id));
  return PRODUCTS.filter((p) => ids.has(p.id));
}

/* ---- persistence for admin edits to seed products (overrides + tombstones) ---- */
const OVER_KEY = "shopscale.product-overrides.v1";
const TOMB_KEY = "shopscale.product-tombstones.v1";

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

{
  const tomb = new Set<string>(loadJSON<string[]>(TOMB_KEY, []));
  const over = loadJSON<Record<string, Product>>(OVER_KEY, {});
  for (let i = PRODUCTS.length - 1; i >= 0; i--) {
    const prod = PRODUCTS[i];
    if (tomb.has(prod.id)) { PRODUCTS.splice(i, 1); continue; }
    if (over[prod.id]) Object.assign(prod, over[prod.id]);
  }
}

/** Snapshot admin changes: custom products, seed overrides, (tombstones via markTombstone). */
export function persistCatalogOverlay() {
  saveCustomProducts(PRODUCTS.filter((x) => x.id.startsWith("c")));
  const ov: Record<string, Product> = {};
  for (const x of PRODUCTS) {
    if (x.id.startsWith("p") && (x.updatedAt ?? "") > (x.createdAt ?? "")) ov[x.id] = x;
  }
  try { localStorage.setItem(OVER_KEY, JSON.stringify(ov)); } catch { /* ignore */ }
}

export function markTombstone(id: string) {
  const t = new Set<string>(loadJSON<string[]>(TOMB_KEY, []));
  t.add(id);
  try { localStorage.setItem(TOMB_KEY, JSON.stringify([...t])); } catch { /* ignore */ }
}

/* Apply persisted inventory adjustments (admin restock / Kafka reservations). */
export const INVENTORY_KEY = "shopscale.inventory.v1";
try {
  const overrides = JSON.parse(localStorage.getItem(INVENTORY_KEY) ?? "{}") as Record<string, number>;
  for (const p of PRODUCTS) if (overrides[p.id] != null) p.stock = overrides[p.id];
} catch { /* ignore */ }

export const HERO_IMAGE = img(IMG.modelGold, 900, 1200);
export const STORY_IMAGE = img(IMG.loom, 900, 1100);
export const STORY_IMAGE_2 = img(IMG.handLoom, 700, 560);
export const HERITAGE_IMAGE = img(IMG.goldFabric, 1400, 800);

/* ------------------------------ demo orders ------------------------------ */

export const MOCK_ORDERS: Order[] = [];

export const MOCK_CRAWLS: CrawlRun[] = [];

/* JMeter — SAMPLE results for illustration only (not real benchmarks). */
export const JMETER_SCENARIOS: { scenario: string; baseline: JMeterSample; optimized: JMeterSample }[] = [
  { scenario: "Homepage", baseline: { label: "Homepage", users: 500, throughput: 640, avgMs: 410, p95Ms: 980, p99Ms: 1650, errorPct: 1.2 }, optimized: { label: "Homepage", users: 500, throughput: 2100, avgMs: 85, p95Ms: 190, p99Ms: 340, errorPct: 0.1 } },
  { scenario: "Listing & search", baseline: { label: "Listing & search", users: 500, throughput: 380, avgMs: 890, p95Ms: 2100, p99Ms: 3400, errorPct: 3.8 }, optimized: { label: "Listing & search", users: 500, throughput: 1450, avgMs: 160, p95Ms: 420, p99Ms: 760, errorPct: 0.3 } },
  { scenario: "Product detail", baseline: { label: "Product detail", users: 500, throughput: 720, avgMs: 360, p95Ms: 840, p99Ms: 1400, errorPct: 0.9 }, optimized: { label: "Product detail", users: 500, throughput: 2600, avgMs: 60, p95Ms: 150, p99Ms: 290, errorPct: 0.1 } },
  { scenario: "Add to cart", baseline: { label: "Add to cart", users: 500, throughput: 450, avgMs: 520, p95Ms: 1300, p99Ms: 2200, errorPct: 2.1 }, optimized: { label: "Add to cart", users: 500, throughput: 980, avgMs: 210, p95Ms: 480, p99Ms: 820, errorPct: 0.4 } },
  { scenario: "Order creation", baseline: { label: "Order creation", users: 500, throughput: 120, avgMs: 2400, p95Ms: 5200, p99Ms: 8100, errorPct: 9.6 }, optimized: { label: "Order creation", users: 500, throughput: 610, avgMs: 140, p95Ms: 360, p99Ms: 690, errorPct: 0.5 } },
  { scenario: "Rate-limit overload", baseline: { label: "Rate-limit overload", users: 2000, throughput: 300, avgMs: 4800, p95Ms: 9800, p99Ms: 14000, errorPct: 38.0 }, optimized: { label: "Rate-limit overload", users: 2000, throughput: 1900, avgMs: 45, p95Ms: 120, p99Ms: 210, errorPct: 0.2 } },
];

export const JMETER_CURVE: { users: number; baseline: number; optimized: number }[] = [
  { users: 50, baseline: 180, optimized: 70 },
  { users: 100, baseline: 260, optimized: 80 },
  { users: 250, baseline: 520, optimized: 110 },
  { users: 500, baseline: 890, optimized: 160 },
  { users: 1000, baseline: 1980, optimized: 290 },
  { users: 2000, baseline: 4100, optimized: 520 },
];