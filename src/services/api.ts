import type { ApiErrorShape } from "../types";

/**
 * Typed HTTP layer. All services route through `request`, so swapping the
 * mock adapters for the real ShopScale backend only requires setting
 * VITE_API_BASE_URL — UI components never talk to fetch directly.
 */
export const API_BASE_URL: string =
  (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_API_BASE_URL ?? "";

export const BACKEND_CONFIGURED = API_BASE_URL.length > 0;

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
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
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
    throw new ApiError({ status: res.status, message: `Request failed (${res.status}). Please try again.` });
  }
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