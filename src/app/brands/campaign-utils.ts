import type { AdCategory, Campaign } from "@/lib/types";

export const ACCENT = "#F2A541";

export const CATEGORY_LABELS: Readonly<Record<AdCategory, string>> = {
  food_beverage: "Food & beverage",
  alcohol: "Alcohol",
  travel: "Travel",
  automotive: "Automotive",
  finance: "Finance",
  tech: "Tech",
  retail: "Retail",
  entertainment: "Entertainment",
  telecom: "Telecom",
  health: "Health",
  gambling: "Gambling",
  public_service: "Public service (PSA)",
};

export const CATEGORIES = Object.keys(CATEGORY_LABELS) as AdCategory[];

export type FlightStatus = "active" | "scheduled" | "ended";

/** Local calendar date as YYYY-MM-DD, comparable with campaign flight dates. */
export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function flightStatus(campaign: Pick<Campaign, "flightStart" | "flightEnd">, today: string): FlightStatus {
  if (campaign.flightStart && campaign.flightStart > today) return "scheduled";
  if (campaign.flightEnd && campaign.flightEnd < today) return "ended";
  return "active";
}

export const FLIGHT_STATUS_LABELS: Readonly<Record<FlightStatus, string>> = {
  active: "Active today",
  scheduled: "Scheduled",
  ended: "Ended",
};

export function targetingSummary(campaign: Campaign): string {
  const parts = [
    campaign.targetCities.length ? `Cities: ${campaign.targetCities.join(", ")}` : "",
    campaign.targetCountries.length ? `Countries: ${campaign.targetCountries.join(", ")}` : "",
    campaign.targetLocales.length ? `Locales: ${campaign.targetLocales.join(", ")}` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Everywhere";
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

interface ApiEnvelope {
  success?: boolean;
  error?: string;
}

/** Fetches JSON and throws a readable error when the request or the API envelope fails. */
export async function fetchJson<T extends ApiEnvelope>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, { cache: "no-store", ...init });
  let body: T;
  try {
    body = (await response.json()) as T;
  } catch {
    throw new Error(`Server returned ${response.status} ${response.statusText || "with an unreadable body"}`);
  }
  if (!response.ok || body.success === false) {
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  return body;
}
