import type { ApiErrorShape, Product, Paged } from "../types";

/**
 * Typed HTTP layer. All services route through `request`, so swapping the
 * mock adapters for the real ShopScale backend only requires setting
 * VITE_API_BASE_URL — UI components never talk to fetch directly.
 */
export const API_BASE_URL: string =
  (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_API_BASE_URL ?? "";

export const BACKEND_CONFIGURED = API_BASE_URL.length > 0;
const ACCESS_TOKEN_KEY = "ss_access_token";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function storeAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export class ApiError extends Error {
  status: number;
  retryAfter?: number;
  constructor({ status, message, retryAfter }: ApiErrorShape) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...authHeaders(), ...(init?.headers ?? {}) },
    ...init,
  });
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("Retry-After") ?? 30);
    throw new ApiError({
      status: 429,
      message: `You're browsing a little fast — our rate limiter paused requests. Please wait about ${retryAfter}s and try again.`,
      retryAfter,
    });
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null) as { detail?: string } | null;
    throw new ApiError({
      status: res.status,
      message: body?.detail ?? `Request failed (${res.status}). Please try again.`,
    });
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Simulated latency so loading skeletons behave like a real network. */
export const mockDelay = (ms = 320) => new Promise<void>((r) => setTimeout(r, ms));

export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — degrade gracefully */
  }
}

type BackendProduct = Record<string, unknown>;

export function normalizeProduct(raw: BackendProduct): Product {
    const images = Array.isArray(raw.images)
      ? raw.images.map((image) => typeof image === "string" ? image : String((image as BackendProduct).url ?? "")).filter(Boolean)
      : [];
    const variety = String(raw.variety ?? "Unverified Saree");
    return {
      id: String(raw.id),
      slug: String(raw.slug),
      name: String(raw.name ?? ""),
      variety,
      varietySlug: String(raw.variety_slug ?? raw.varietySlug ?? variety.toLowerCase().replace(/[^a-z0-9]+/g, "-")),
      category: variety,
      state: String(raw.state ?? raw.region ?? "India"),
      country: String(raw.country ?? "India") as Product["country"],
      zone: String(raw.zone ?? "Central India") as Product["zone"],
      kind: String(raw.garment_kind ?? "Saree") as Product["kind"],
      status: "established",
      fabric: String(raw.fabric_name ?? "Silk") as Product["fabric"],
      fabricDetail: String(raw.fabric_detail ?? raw.fabric_name ?? "Fabric details unavailable"),
      composition: String(raw.composition ?? "Pure") as Product["composition"],
      loom: String(raw.loom ?? "Handloom") as Product["loom"],
      techniques: Array.isArray(raw.techniques) ? raw.techniques as Product["techniques"] : [],
      occasion: Array.isArray(raw.occasions) ? raw.occasions as Product["occasion"] : [],
      colours: Array.isArray(raw.colours) ? raw.colours as Product["colours"] : [],
      colors: Array.isArray(raw.color_variants) ? raw.color_variants as string[] : [],
      motif: String(raw.motif ?? "Traditional") as Product["motif"],
      border: String(raw.border ?? "Plain") as Product["border"],
      weight: String(raw.weight_class ?? "Medium") as Product["weight"],
      care: String(raw.care_type ?? "Hand wash") as Product["care"],
      careText: String(raw.care_text ?? ""),
      price: Number(raw.price ?? 0),
      originalPrice: raw.original_price == null ? undefined : Number(raw.original_price),
      badge: raw.badge as Product["badge"],
      rating: Number(raw.rating ?? 0),
      reviews: Number(raw.review_count ?? 0),
      stock: Number(raw.stock ?? 0),
      images,
      imageCaptions: images.map((_, index) => index === 0 ? "Primary view" : `View ${index + 1}`),
      description: String(raw.description ?? ""),
      story: String(raw.story ?? ""),
      pallu: String(raw.pallu_description ?? ""),
      length: String(raw.length_meters ?? ""),
      blousePiece: raw.blouse_piece == null ? null : Boolean(raw.blouse_piece),
      artisan: String(raw.artisan_name ?? "Weaving cluster"),
      collections: Array.isArray(raw.collections) ? raw.collections as string[] : [],
      originVerified: Boolean(raw.origin_verified),
      createdAt: String(raw.created_at ?? ""),
      bestseller: Boolean(raw.is_bestseller),
      isNew: Boolean(raw.is_new),
      tags: Array.isArray(raw.tags) ? raw.tags as string[] : [],
      sku: String(raw.sku ?? ""),
      publication: String(raw.publication ?? "published") as Product["publication"],
      lowStockThreshold: Number(raw.low_stock_threshold ?? 3),
      weightG: raw.weight_grams == null ? null : Number(raw.weight_grams),
      giftEligible: Boolean(raw.gift_eligible ?? true),
      updatedAt: String(raw.updated_at ?? raw.created_at ?? ""),
    };
}

export function normalizePaged(raw: Record<string, unknown>): Paged<Product> {
  return {
    items: Array.isArray(raw.items) ? raw.items.map((item) => normalizeProduct(item as BackendProduct)) : [],
    total: Number(raw.total ?? 0),
    page: Number(raw.page ?? 1),
    pageSize: Number(raw.page_size ?? raw.pageSize ?? 24),
    facets: {},
    meta: { cache: "BYPASS", ms: Number((raw.meta as BackendProduct | undefined)?.ms ?? 0) },
  };
}