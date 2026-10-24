import { IMG, img, slugify, varietyByName } from "../data/catalogue";
import { PRODUCTS, markTombstone, persistCatalogOverlay } from "../data/products";
import { inr } from "../lib/format";
import type {
  AuditEntry, BackInStockAlert, Banner, Border, CareType, Colour, Composition,
  FabricFamily, Loom, Motif, Occasion, Order, Product, ReturnRequest,
  Review, SavedAddress, Technique, Weight,
} from "../types";
import { cache } from "../lib/sim";
import { readStorage, writeStorage } from "./api";

/* ===========================================================================
   Catalogue & shopper services (demo, local-first).
   productCatalog is the single writer for admin product changes: it mutates the
   in-memory PRODUCTS, persists the custom overlay, invalidates cache keys and
   writes an audit entry — mirroring what a backend + Redis would do.
=========================================================================== */

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/* --------------------------------- audit --------------------------------- */

const AUDIT_KEY = "shopscale.audit.v1";

export const auditService = {
  list: (): AuditEntry[] => readStorage<AuditEntry[]>(AUDIT_KEY, []),
  log(action: string, detail: string, actor = "admin (demo)") {
    const entry: AuditEntry = { id: uid("audit"), at: new Date().toISOString(), actor, action, detail };
    writeStorage(AUDIT_KEY, [entry, ...this.list()].slice(0, 200));
    return entry;
  },
  clear() { writeStorage(AUDIT_KEY, []); },
};

/* ------------------------------ admin products ---------------------------- */

export interface ProductInput {
  name: string;
  variety: string;
  description: string;
  fabric: FabricFamily;
  fabricDetail: string;
  composition: Composition;
  loom: Loom;
  techniques: Technique[];
  colours: Colour[];
  colorVariants: string[];
  motif: Motif;
  border: Border;
  weight: Weight;
  weightG?: number | null;
  care: CareType;
  price: number;
  originalPrice?: number;
  stock: number;
  lowStockThreshold: number;
  images: string[];
  occasion: Occasion[];
  collections: string[];
  originVerified: boolean;
  artisan: string;
  length: string;
  blousePiece: boolean | null;
  pallu: string;
  story: string;
  badge?: Product["badge"];
  giftEligible: boolean;
}

export const EMPTY_INPUT: ProductInput = {
  name: "", variety: "", description: "", fabric: "Silk", fabricDetail: "", composition: "Pure",
  loom: "Handloom", techniques: [], colours: [], colorVariants: [], motif: "Traditional",
  border: "Plain", weight: "Medium", weightG: null, care: "Dry clean", price: 0,
  originalPrice: undefined, stock: 0, lowStockThreshold: 3, images: [], occasion: [],
  collections: [], originVerified: false, artisan: "", length: "", blousePiece: null,
  pallu: "", story: "", badge: undefined, giftEligible: true,
};

export function validateProductInput(v: ProductInput): Record<string, string> {
  const e: Record<string, string> = {};
  if (v.name.trim().length < 4) e.name = "Product name must be at least 4 characters.";
  if (!v.variety) e.variety = "Choose a traditional variety.";
  else if (!varietyByName(v.variety)) e.variety = "Unknown variety — pick one from the catalogue list.";
  if (v.description.trim().length < 20) e.description = "Short description must be at least 20 characters.";
  if (!v.fabricDetail.trim()) e.fabricDetail = "Describe the actual fabric (e.g. “Pure mulberry silk”).";
  if (!Number.isFinite(v.price) || v.price <= 0) e.price = "Selling price must be greater than zero.";
  if (v.originalPrice != null && v.originalPrice <= v.price) e.originalPrice = "Original price must be higher than the selling price.";
  if (!Number.isInteger(v.stock) || v.stock < 0) e.stock = "Stock must be a whole number, 0 or more.";
  if (!Number.isInteger(v.lowStockThreshold) || v.lowStockThreshold < 0) e.lowStockThreshold = "Threshold must be 0 or more.";
  if (v.images.length === 0) e.images = "Add at least one image (upload preview or catalogue image).";
  if (v.images.length > 8) e.images = "A maximum of 8 images is supported in this demo.";
  if (v.techniques.length === 0) e.techniques = "Select at least one technique.";
  if (v.colours.length === 0) e.colours = "Select at least one main colour.";
  if (v.occasion.length === 0) e.occasion = "Select at least one occasion.";
  if (!v.length.trim()) e.length = "State the saree length and blouse-piece details.";
  if (v.weightG != null && (v.weightG <= 0 || v.weightG > 5000)) e.weightG = "Weight must be between 1 and 5000 g, or left empty.";
  return e;
}

function inputToProduct(v: ProductInput, base?: Product): Product {
  const variety = varietyByName(v.variety);
  const now = new Date().toISOString();
  const id = base?.id ?? `c${Date.now().toString(36)}`;
  const slugBase = slugify(v.name) || id;
  let slug = base?.slug ?? slugBase;
  if (!base) {
    let n = 2;
    while (PRODUCTS.some((p) => p.slug === slug)) slug = `${slugBase}-${n++}`;
  }
  const colors = v.colorVariants.map((c) => c.trim()).filter(Boolean);
  return {
    id,
    slug,
    name: v.name.trim(),
    variety: variety?.name ?? v.variety,
    varietySlug: variety?.slug ?? slugify(v.variety),
    category: variety?.name ?? v.variety,
    state: variety?.state ?? "—",
    country: variety?.country ?? "India",
    zone: variety?.zone ?? "South India",
    kind: variety?.kind ?? "Saree",
    status: variety?.status ?? "established",
    fabric: v.fabric,
    fabricDetail: v.fabricDetail.trim(),
    composition: v.composition,
    loom: v.loom,
    techniques: v.techniques,
    occasion: v.occasion,
    colours: v.colours,
    colors: colors.length ? colors : v.colours.length ? [v.colours.join(" & ")] : ["As shown"],
    motif: v.motif,
    border: v.border,
    weight: v.weight,
    care: v.care,
    careText: base?.careText ?? "Follow the care label. When in doubt, dry clean silk and zari pieces.",
    price: Math.round(v.price),
    originalPrice: v.originalPrice ? Math.round(v.originalPrice) : undefined,
    badge: v.badge,
    rating: base?.rating ?? 0,
    reviews: base?.reviews ?? 0,
    stock: v.stock,
    images: v.images,
    imageCaptions: v.images.map((_, i) => (i === 0 ? "Primary view" : `View ${i + 1}`)),
    description: v.description.trim(),
    story: v.story.trim() || base?.story || "Artisan story to be confirmed with the weaving cluster.",
    pallu: v.pallu.trim() || "Pallu details to be confirmed by the weaver",
    length: v.length.trim(),
    blousePiece: v.blousePiece,
    artisan: v.artisan.trim() || "Weaving cluster (unverified)",
    collections: v.collections,
    originVerified: v.originVerified,
    createdAt: base?.createdAt ?? now,
    bestseller: base?.bestseller ?? false,
    isNew: base ? base.isNew : true,
    tags: [v.name, variety?.name ?? "", variety?.state ?? "", v.fabric, ...v.techniques, ...v.occasion, ...v.colours, ...v.collections].filter(Boolean),
    sku: base?.sku ?? `SS-C${Date.now().toString(36).toUpperCase()}`,
    publication: base?.publication ?? "draft",
    lowStockThreshold: v.lowStockThreshold,
    weightG: v.weightG ?? null,
    drape: undefined,
    giftEligible: v.giftEligible,
    updatedAt: now,
    adminNote: undefined,
  };
}

export const productCatalog = {
  /** Every product including drafts (admin views). */
  all: (): Product[] => [...PRODUCTS],
  published: (): Product[] => PRODUCTS.filter((p) => (p.publication ?? "published") === "published"),
  get: (id: string) => PRODUCTS.find((p) => p.id === id),
  counts() {
    const all = PRODUCTS;
    return {
      total: all.length,
      published: all.filter((p) => (p.publication ?? "published") === "published").length,
      draft: all.filter((p) => p.publication === "draft").length,
      inReview: all.filter((p) => p.publication === "in-review").length,
      archived: all.filter((p) => p.publication === "archived").length,
      low: all.filter((p) => p.stock > 0 && p.stock <= (p.lowStockThreshold ?? 3)).length,
      out: all.filter((p) => p.stock <= 0).length,
    };
  },
  recentChanges(limit = 8): Product[] {
    return [...PRODUCTS].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")).slice(0, limit);
  },
  create(input: ProductInput): Product {
    const p = inputToProduct(input);
    PRODUCTS.push(p);
    persistCatalogOverlay();
    cache.invalidate("list:", "related:", `product:${p.slug}`);
    auditService.log("product.create", `${p.name} (${p.sku}) saved as ${p.publication}`);
    return p;
  },
  update(id: string, input: ProductInput): Product | undefined {
    const existing = PRODUCTS.find((p) => p.id === id);
    if (!existing) return undefined;
    const next = inputToProduct(input, existing);
    Object.assign(existing, next);
    persistCatalogOverlay();
    cache.invalidate("list:", "related:", `product:${existing.slug}`);
    auditService.log("product.update", `${existing.name} (${existing.sku}) updated`);
    return existing;
  },
  setStatus(id: string, publication: Product["publication"]): Product | undefined {
    const p = PRODUCTS.find((x) => x.id === id);
    if (!p) return undefined;
    p.publication = publication;
    p.updatedAt = new Date().toISOString();
    persistCatalogOverlay();
    cache.invalidate("list:", `product:${p.slug}`);
    auditService.log("product.status", `${p.name} (${p.sku}) → ${publication}`);
    return p;
  },
  remove(id: string) {
    const i = PRODUCTS.findIndex((p) => p.id === id);
    if (i < 0) return false;
    const [p] = PRODUCTS.splice(i, 1);
    if (!p.id.startsWith("c")) markTombstone(p.id);
    persistCatalogOverlay();
    cache.invalidate("list:", "related:", `product:${p.slug}`);
    auditService.log("product.delete", `${p.name} (${p.sku}) deleted`);
    return true;
  },
  bulkSetStatus(ids: string[], publication: Product["publication"]) {
    let n = 0;
    for (const id of ids) if (this.setStatus(id, publication)) n++;
    return n;
  },
  updateStock(id: string, stock: number) {
    const p = PRODUCTS.find((x) => x.id === id);
    if (!p) return 0;
    p.stock = Math.max(0, Math.round(stock));
    p.updatedAt = new Date().toISOString();
    persistCatalogOverlay();
    const removed = cache.invalidate(`product:${p.slug}`, "list:", "related:");
    // fulfil pending back-in-stock alerts
    const alerts = alertService.forProduct(p.id).filter((a) => !a.notified);
    if (p.stock > 0 && alerts.length) alertService.markNotified(p.id);
    auditService.log("inventory.update", `${p.name} (${p.sku}) stock → ${p.stock}; ${removed} cache keys invalidated; ${p.stock > 0 ? alerts.length : 0} back-in-stock alerts fulfilled`);
    return removed;
  },
  setThreshold(id: string, threshold: number) {
    const p = PRODUCTS.find((x) => x.id === id);
    if (!p) return;
    p.lowStockThreshold = Math.max(0, Math.round(threshold));
    p.updatedAt = new Date().toISOString();
    persistCatalogOverlay();
    auditService.log("inventory.threshold", `${p.name} (${p.sku}) low-stock threshold → ${p.lowStockThreshold}`);
  },
  exportCSV(ids?: string[]): string {
    const rows = (ids ? PRODUCTS.filter((p) => ids.includes(p.id)) : PRODUCTS);
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = "sku,name,variety,price,originalPrice,stock,publication,fabric,loom,state";
    const lines = rows.map((p) => [p.sku, p.name, p.variety, p.price, p.originalPrice ?? "", p.stock, p.publication ?? "published", p.fabric, p.loom, p.state].map(esc).join(","));
    return [head, ...lines].join("\n");
  },
  importCSV(text: string): { created: number; errors: string[] } {
    const errors: string[] = [];
    let created = 0;
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return { created, errors: ["The file is empty."] };
    const head = lines[0].toLowerCase();
    const start = head.includes("sku") && head.includes("name") ? 1 : 0;
    const parse = (line: string): string[] => {
      const out: string[] = [];
      let cur = "", inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (inQ && c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') inQ = !inQ;
        else if (c === "," && !inQ) { out.push(cur.trim()); cur = ""; }
        else cur += c;
      }
      out.push(cur.trim());
      return out;
    };
    lines.slice(start).forEach((line, i) => {
      const [sku, name, variety, price, , stock] = parse(line);
      const rowNo = i + start + 1;
      if (!name || name.length < 4) { errors.push(`Row ${rowNo}: name is required (min 4 characters).`); return; }
      if (!varietyByName(variety || "")) { errors.push(`Row ${rowNo}: unknown variety “${variety}”.`); return; }
      const pr = Number(price);
      if (!Number.isFinite(pr) || pr <= 0) { errors.push(`Row ${rowNo}: price must be greater than zero.`); return; }
      const st = Number(stock ?? 0);
      if (!Number.isInteger(st) || st < 0) { errors.push(`Row ${rowNo}: stock must be a whole number ≥ 0.`); return; }
      const v = varietyByName(variety)!;
      this.create({
        ...EMPTY_INPUT,
        name, variety: v.name, description: `${v.blurb} (Imported via CSV — description to be completed.)`,
        fabric: v.fabrics[0], fabricDetail: v.fabrics[0], techniques: v.techniques.slice(0, 2),
        colours: ["Multicolour"], occasion: v.occasions.slice(0, 2), price: pr, stock: st,
        images: [img(IMG.goldFabric, 700, 933)], length: "Length and blouse-piece details to be confirmed",
        artisan: `${v.state} weaving cluster (unverified)`, story: "",
      });
      created++;
      void sku;
    });
    auditService.log("product.csv-import", `${created} created, ${errors.length} rows rejected`);
    return { created, errors };
  },
};

/* --------------------------------- reviews --------------------------------- */

const REVIEWS_KEY = "shopscale.reviews.v1";
export const reviewService = {
  list(productId: string): Review[] {
    const user = readStorage<Review[]>(REVIEWS_KEY, []).filter((r) => r.productId === productId);
    return user;
  },
  average(productId: string) {
    const all = this.list(productId);
    if (!all.length) return { avg: 0, count: 0 };
    return { avg: Math.round((all.reduce((a, r) => a + r.rating, 0) / all.length) * 10) / 10, count: all.length };
  },
  add(productId: string, r: { author: string; rating: number; title: string; body: string }): Review {
    const review: Review = { id: uid("rev"), productId, author: r.author.trim(), rating: r.rating, title: r.title.trim(), body: r.body.trim(), date: new Date().toISOString().slice(0, 10), verified: true, demo: false };
    writeStorage(REVIEWS_KEY, [review, ...readStorage<Review[]>(REVIEWS_KEY, [])]);
    return review;
  },
};

/* ------------------------------ back in stock ------------------------------ */

const ALERTS_KEY = "shopscale.alerts.v1";

export const alertService = {
  list: (): BackInStockAlert[] => readStorage<BackInStockAlert[]>(ALERTS_KEY, []),
  forProduct: (productId: string) => alertService.list().filter((a) => a.productId === productId),
  subscribed: (productId: string, email: string) =>
    alertService.list().some((a) => a.productId === productId && a.email.toLowerCase() === email.trim().toLowerCase() && !a.notified),
  subscribe(productId: string, email: string): BackInStockAlert {
    const alert: BackInStockAlert = { id: uid("alert"), productId, email: email.trim(), notified: false, createdAt: new Date().toISOString() };
    writeStorage(ALERTS_KEY, [alert, ...alertService.list()]);
    return alert;
  },
  markNotified(productId: string) {
    writeStorage(ALERTS_KEY, alertService.list().map((a) => (a.productId === productId && !a.notified ? { ...a, notified: true } : a)));
  },
  pending: () => alertService.list().filter((a) => !a.notified),
};

/* --------------------------------- returns --------------------------------- */

const RETURNS_KEY = "shopscale.returns.v1";

export const returnService = {
  list: (): ReturnRequest[] => readStorage<ReturnRequest[]>(RETURNS_KEY, []),
  byEmail: (email: string) => returnService.list().filter((r) => r.email.toLowerCase() === email.trim().toLowerCase()),
  create(input: { orderRef: string; email: string; reason: string; details: string; orders: Order[] }): ReturnRequest {
    const order = input.orders.find((o) => o.reference.toLowerCase() === input.orderRef.trim().toLowerCase());
    if (!order) throw new Error("We couldn't find that order reference in demo records.");
    if (order.email.toLowerCase() !== input.email.trim().toLowerCase()) throw new Error("That order belongs to a different email address.");
    if (returnService.list().some((r) => r.orderRef.toLowerCase() === order.reference.toLowerCase() && r.status !== "rejected")) {
      throw new Error("A return request already exists for this order.");
    }
    const req: ReturnRequest = {
      id: uid("ret"), orderRef: order.reference, email: input.email.trim(),
      reason: input.reason, details: input.details.trim(), status: "requested",
      createdAt: new Date().toISOString(), mock: true,
    };
    writeStorage(RETURNS_KEY, [req, ...returnService.list()]);
    auditService.log("support.return", `Return ${req.id} requested for ${order.reference} — ${input.reason}`);
    return req;
  },
  setStatus(id: string, status: ReturnRequest["status"]) {
    writeStorage(RETURNS_KEY, returnService.list().map((r) => (r.id === id ? { ...r, status } : r)));
    auditService.log("support.return-status", `Return ${id} → ${status}`);
  },
};

/* -------------------------------- addresses -------------------------------- */

const ADDR_KEY = "shopscale.addresses.v1";

export const addressService = {
  list: (email: string): SavedAddress[] => readStorage<Record<string, SavedAddress[]>>(ADDR_KEY, {})[email.toLowerCase()] ?? [],
  save(email: string, addr: Omit<SavedAddress, "id"> & { id?: string }): SavedAddress[] {
    const key = email.toLowerCase();
    const all = readStorage<Record<string, SavedAddress[]>>(ADDR_KEY, {});
    const list = all[key] ?? [];
    let next: SavedAddress[];
    if (addr.id) next = list.map((a) => (a.id === addr.id ? { ...addr, id: addr.id } as SavedAddress : a));
    else next = [...list, { ...addr, id: uid("addr") } as SavedAddress];
    if (addr.isDefault) next = next.map((a) => ({ ...a, isDefault: a.id === (addr.id ?? next[next.length - 1].id) }));
    if (!next.some((a) => a.isDefault) && next.length) next[0].isDefault = true;
    writeStorage(ADDR_KEY, { ...all, [key]: next });
    return next;
  },
  remove(email: string, id: string): SavedAddress[] {
    const key = email.toLowerCase();
    const all = readStorage<Record<string, SavedAddress[]>>(ADDR_KEY, {});
    const next = (all[key] ?? []).filter((a) => a.id !== id);
    if (next.length && !next.some((a) => a.isDefault)) next[0].isDefault = true;
    writeStorage(ADDR_KEY, { ...all, [key]: next });
    return next;
  },
};

/* --------------------------------- compare --------------------------------- */

const COMPARE_KEY = "shopscale.compare.v1";
export const MAX_COMPARE = 3;

export const compareService = {
  get: (): string[] => readStorage<string[]>(COMPARE_KEY, []).filter((id) => PRODUCTS.some((p) => p.id === id)).slice(0, MAX_COMPARE),
  set: (ids: string[]) => writeStorage(COMPARE_KEY, ids.slice(0, MAX_COMPARE)),
  toggle: (id: string): { ids: string[]; added: boolean; full: boolean } => {
    const cur = compareService.get();
    if (cur.includes(id)) {
      const ids = cur.filter((x) => x !== id);
      compareService.set(ids);
      return { ids, added: false, full: false };
    }
    if (cur.length >= MAX_COMPARE) return { ids: cur, added: false, full: true };
    const ids = [...cur, id];
    compareService.set(ids);
    return { ids, added: true, full: false };
  },
  clear: () => writeStorage(COMPARE_KEY, []),
};

/* ------------------------------ content (CMS) ------------------------------ */

export interface HomeContent {
  announcement: string[];
  heroTitleA: string;
  heroTitleB: string;
  heroSubtitle: string;
}

const CONTENT_KEY = "shopscale.content.v1";

const DEFAULT_HOME: HomeContent = {
  announcement: [
    "Celebrate India's weaving heritage — 140+ traditions catalogued",
    "Free shipping on orders above ₹2,999",
    "Discover handpicked regional collections",
  ],
  heroTitleA: "Every Saree",
  heroTitleB: "Tells a Story.",
  heroSubtitle: "From the rich silks of Kanchipuram to the delicate weaves of Bengal, discover the artistry woven into every drape.",
};

const BANNERS_KEY = "shopscale.banners.v1";
const DEFAULT_BANNERS: Banner[] = [
  { id: "b1", title: "The Wedding Edit", subtitle: "Bridal Kanjivaram, Banarasi & Paithani", image: img(IMG.bengaliBride, 1200, 500), to: "/shop?occasion=Wedding", active: true },
  { id: "b2", title: "Summer Cottons", subtitle: "Tant, Kota Doria & mulmul under ₹2,500", image: img(IMG.durgaPuja, 1200, 500), to: "/shop?occasion=Summer", active: true },
];

export const contentService = {
  home: (): HomeContent => ({ ...DEFAULT_HOME, ...readStorage<Partial<HomeContent>>(CONTENT_KEY, {}) }),
  saveHome(patch: Partial<HomeContent>, actor = "admin (demo)") {
    writeStorage(CONTENT_KEY, { ...this.home(), ...patch });
    auditService.log("content.home", "Homepage copy updated", actor);
  },
  banners: (): Banner[] => {
    const custom = readStorage<Banner[] | null>(BANNERS_KEY, null);
    return custom ?? DEFAULT_BANNERS;
  },
  saveBanners(banners: Banner[], actor = "admin (demo)") {
    writeStorage(BANNERS_KEY, banners);
    auditService.log("content.banners", `${banners.filter((b) => b.active).length} homepage banners active`, actor);
  },
};

/* ------------------------------- sample image ------------------------------ */

export const SAMPLE_IMAGES: { id: number; label: string }[] = [
  { id: IMG.goldenTN, label: "Golden silk drape" },
  { id: IMG.keralaJasmine, label: "Kasavu & jasmine" },
  { id: IMG.durgaPuja, label: "Festive red & white" },
  { id: IMG.patterned, label: "Woven motifs" },
  { id: IMG.bridalCloseup, label: "Bridal brocade" },
  { id: IMG.warmGlow, label: "Tussar glow" },
  { id: IMG.studio, label: "Studio silk" },
  { id: IMG.orangeMarket, label: "Market cotton" },
  { id: IMG.vibrant, label: "Vibrant silk" },
  { id: IMG.goldFabric, label: "Gold fabric detail" },
  { id: IMG.beigeCotton, label: "Natural cotton" },
  { id: IMG.handLoom, label: "On the loom" },
];

export const GIFT_WRAP_PRICE = 99;
export const giftTotal = (wrap: boolean) => (wrap ? GIFT_WRAP_PRICE : 0);

/** Demo-friendly price formatter used by admin tables. */
export const csvPrice = (n: number) => inr(n);
