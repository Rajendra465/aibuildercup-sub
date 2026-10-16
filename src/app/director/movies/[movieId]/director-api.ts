import type { AdCategory } from "@/lib/types";

/** Amber accent used for every ad-related surface in the Director Studio. */
export const AD_ACCENT = "#F2A541";

export const AD_CATEGORIES: { value: AdCategory; label: string }[] = [
  { value: "food_beverage", label: "Food & beverage" },
  { value: "alcohol", label: "Alcohol" },
  { value: "travel", label: "Travel" },
  { value: "automotive", label: "Automotive" },
  { value: "finance", label: "Finance" },
  { value: "tech", label: "Tech" },
  { value: "retail", label: "Retail" },
  { value: "entertainment", label: "Entertainment" },
  { value: "telecom", label: "Telecom" },
  { value: "health", label: "Health" },
  { value: "gambling", label: "Gambling" },
  { value: "public_service", label: "Public service" },
];

interface ApiEnvelope {
  success?: boolean;
  error?: string;
}

/**
 * fetch + JSON with the app's `{success, error}` envelope. Throws a readable Error on
 * network failures, non-2xx responses and `success: false`.
 */
export async function fetchJson<T extends object>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  let body: (T & ApiEnvelope) | null = null;
  try {
    body = (await response.json()) as T & ApiEnvelope;
  } catch {
    body = null;
  }
  if (!response.ok || !body || body.success === false) {
    throw new Error(body?.error || `Request failed (${response.status})`);
  }
  return body;
}

export function jsonInit(method: "POST" | "PUT", payload: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) };
}

export const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

// --- Flash messages that survive the reload after seed.ts is rewritten -------------

const FLASH_KEY = "inscene:director-flash";

export function setFlash(message: string): void {
  try {
    window.sessionStorage.setItem(FLASH_KEY, message);
  } catch {
    // Storage can be unavailable (private mode); the reload still applies the change.
  }
}

export function takeFlash(): string | null {
  try {
    const message = window.sessionStorage.getItem(FLASH_KEY);
    if (message) window.sessionStorage.removeItem(FLASH_KEY);
    return message;
  } catch {
    return null;
  }
}

/** Seed edits only take effect once Next re-evaluates seed.ts, so reload with a flash message. */
export function reloadWithFlash(message: string): void {
  setFlash(message);
  window.location.reload();
}

export const formatSeconds = (value: number): string => `${value.toFixed(1)}s`;
export const percent = (value: number): string => `${Math.round(value * 100)}%`;
