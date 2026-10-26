/* =====================================================================
   ShopScale — World of Sarees · domain model
   Every classification is data, so new regions / varieties / techniques
   can be added to the catalogue without touching UI code.
   ===================================================================== */

export type Country =
  | "India" | "Bangladesh" | "Sri Lanka" | "Pakistan" | "Nepal"
  | "Indonesia" | "Malaysia" | "Cambodia" | "Laos" | "Thailand" | "Myanmar";

export type Zone =
  | "South India" | "West India" | "East India" | "Northeast India"
  | "North India" | "Central India" | "South Asia" | "Southeast Asia";

/** Saree, a related (non-saree) draped garment, or a multi-piece ensemble. */
export type GarmentKind = "Saree" | "Related Drape" | "Ensemble";

/** established = recognised traditional variety; inspired = contemporary adaptation. */
export type VarietyStatus = "established" | "inspired";

/** Official "Pan-India Sarees of Handloom Sectors" compilation zone. */
export type HandloomZone = "North Zone" | "East Zone" | "West Zone" | "South Zone";

export type FabricFamily =
  | "Silk" | "Cotton" | "Silk-Cotton" | "Linen" | "Organza" | "Chiffon" | "Georgette"
  | "Crepe" | "Tussar" | "Muga" | "Eri" | "Khadi" | "Tissue" | "Blended";

export type TechniqueGroup = "Weave" | "Print & Dye" | "Embroidery & Surface";

export type Technique =
  | "Handloom" | "Ikat" | "Double Ikat" | "Jamdani" | "Brocade" | "Tanchoi" | "Butidar"
  | "Zari Work" | "Temple Border"
  | "Tie-Dye" | "Bandhani" | "Leheriya" | "Block Print" | "Kalamkari" | "Batik" | "Hand Painted"
  | "Embroidery" | "Chikankari" | "Gota Patti" | "Zardozi" | "Kantha" | "Phulkari" | "Mirror Work"
  | "Cutwork" | "Kani Weave";

export type Occasion =
  | "Wedding" | "Festive" | "Ceremony" | "Office" | "Everyday" | "Evening"
  | "Summer" | "Gifting" | "Contemporary";

export type Loom = "Handloom" | "Powerloom" | "Machine-woven";
export type Composition = "Pure" | "Blend" | "Art Silk / Synthetic" | "Natural Fibre";
export type Weight = "Lightweight" | "Medium" | "Heavy";
export type Border = "Zari" | "Temple" | "Contrast" | "Plain" | "Embroidered";
export type Motif = "Floral" | "Geometric" | "Checks" | "Stripes" | "Paisley" | "Temple" | "Traditional" | "Contemporary" | "Figurative";
export type CareType = "Dry clean" | "Hand wash" | "Machine washable";
export type Colour =
  | "Red" | "Maroon" | "Pink" | "Orange" | "Yellow" | "Green" | "Blue" | "Purple"
  | "Black" | "White" | "Ivory" | "Beige" | "Gold" | "Multicolour";
export type Badge = "Bestseller" | "New Arrival" | "Limited Edition" | "Sale";

/** Demo catalogue publication workflow (mirrors a backend status column). */
export type PublicationStatus = "draft" | "in-review" | "published" | "archived";

/** Customer / admin roles. Frontend guards are UX-only; a real backend must enforce roles server-side. */
export type Role = "customer" | "admin";

export interface Variety {
  slug: string;
  name: string;
  aliases: string[];
  state: string;          // Indian state or country-level region
  country: Country;
  zone: Zone;
  kind: GarmentKind;
  status: VarietyStatus;
  fabrics: FabricFamily[];
  techniques: Technique[];
  occasions: Occasion[];
  blurb: string;
  /** Zone in the official Government handloom-sector compilation, when listed there. */
  handloomZone?: HandloomZone;
}

export interface RegionInfo {
  name: string;
  zone: Zone;
  country: Country;
  tradition: string;
  story: string;
  image: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  variety: string;
  varietySlug: string;
  /** Display category (= variety name) — kept for compact UI labels. */
  category: string;
  state: string;
  country: Country;
  zone: Zone;
  kind: GarmentKind;
  status: VarietyStatus;
  fabric: FabricFamily;
  fabricDetail: string;
  composition: Composition;
  loom: Loom;
  techniques: Technique[];
  occasion: Occasion[];
  colours: Colour[];
  /** Purchasable colour variants (display names). */
  colors: string[];
  motif: Motif;
  border: Border;
  weight: Weight;
  care: CareType;
  careText: string;
  price: number;
  originalPrice?: number;
  badge?: Badge;
  rating: number;
  reviews: number;
  stock: number;
  images: string[];
  /** Parallel to `images` — what each view actually shows. */
  imageCaptions: string[];
  description: string;
  story: string;
  pallu: string;
  length: string;
  blousePiece: boolean | null;
  artisan: string;
  collections: string[];
  originVerified: boolean;
  createdAt: string;
  bestseller: boolean;
  isNew: boolean;
  tags: string[];
  /* ---- catalogue management (admin) ---- */
  sku: string;
  publication: PublicationStatus;
  lowStockThreshold: number;
  weightG?: number | null;
  drape?: string;
  giftEligible: boolean;
  updatedAt: string;
  adminNote?: string;
}

export interface CartItem {
  productId: string;
  color: string;
  quantity: number;
}

export interface Address {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
}

export type OrderStatus = "placed" | "confirmed" | "processing" | "packed" | "shipped" | "delivered" | "cancelled";

export interface GiftOption {
  wrap: boolean;
  message?: string;
}

export interface Order {
  id: string;
  reference: string;
  items: { productId: string; name: string; color: string; quantity: number; price: number; image: string }[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  email: string;
  address: Address;
  status: OrderStatus;
  createdAt: string;
  mock: boolean;
  gift?: GiftOption;
  events: { status: OrderStatus; at: string; note: string }[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface SavedAddress extends Address {
  id: string;
  label: string;
  isDefault?: boolean;
}

export interface Review {
  id: string;
  productId: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  date: string;
  verified: boolean;
  demo: boolean;
}

export type ReturnStatus = "requested" | "approved" | "rejected" | "refunded";

export interface ReturnRequest {
  id: string;
  orderRef: string;
  email: string;
  reason: string;
  details: string;
  status: ReturnStatus;
  createdAt: string;
  mock: boolean;
}

export interface BackInStockAlert {
  id: string;
  productId: string;
  email: string;
  notified: boolean;
  createdAt: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  to: string;
  active: boolean;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail: string;
}

/** Filter dimensions — every key maps to an accessor in services/filters.ts */
export type FilterKey =
  | "country" | "zone" | "state" | "category" | "variety" | "kind" | "fabric" | "composition"
  | "weave" | "print" | "embellishment" | "occasion" | "colour" | "loom" | "border"
  | "motif" | "weight" | "availability" | "collection" | "artisan" | "care" | "certification";

export type SortKey = "recommended" | "newest" | "price-asc" | "price-desc" | "popularity" | "rating";

export interface ProductQuery {
  q?: string;
  includeUnpublished?: boolean;
  filters?: Partial<Record<FilterKey, string[]>>;
  minPrice?: number;
  maxPrice?: number;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  /** Facet counts for the current result set (before pagination). */
  facets: Partial<Record<FilterKey, Record<string, number>>>;
  suggestion?: string;
  meta: { cache: "HIT" | "MISS" | "BYPASS"; ms: number };
}

export interface CrawlRun {
  id: string;
  seed: string;
  startedAt: string;
  status: "queued" | "running" | "completed" | "failed" | "blocked";
  robotsAllowed: boolean;
  discovered: number;
  processed: number;
  failed: number;
  duplicates: number;
  pendingReview: number;
  imported: number;
}

export interface JMeterSample {
  label: string;
  users: number;
  throughput: number;
  avgMs: number;
  p95Ms: number;
  p99Ms: number;
  errorPct: number;
}

export interface ShortLink {
  code: string;
  target: string;
  label: string;
  clicks: number;
  referrers: Record<string, number>;
  createdAt: string;
}

export interface ApiErrorShape {
  status: number;
  message: string;
  retryAfter?: number;
}