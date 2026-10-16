import type {
  AdDecision,
  AdEventType,
  ExposureReport,
  GenerationJobStatus,
  SceneSafetyProfile,
  SlotAdPolicy,
} from "@/lib/types";

export interface AdSlotCut {
  jobId: string;
  status: GenerationJobStatus;
  exposure?: ExposureReport;
  audioAssetUrl?: string;
  approved: boolean;
}

export interface AdSlotInfo {
  slotId: string;
  label: string;
  startSeconds: number;
  endSeconds: number;
  policy: SlotAdPolicy;
  scene: SceneSafetyProfile;
  decision: AdDecision;
  cut: AdSlotCut | null;
}

interface DecisionsResponse {
  success: boolean;
  date?: string;
  slots?: AdSlotInfo[];
  error?: string;
}

export interface AdEventPayload {
  type: AdEventType;
  campaignId: string;
  movieId: string;
  slotId: string;
  profileId: string;
  exposureScore?: number;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Returns the date only when it is a well-formed YYYY-MM-DD string. */
export function validSimulatedDate(value: string | null | undefined): string | null {
  return value && DATE_PATTERN.test(value) ? value : null;
}

export async function fetchAdDecisions(
  movieId: string,
  profileId: string,
  date: string | null,
): Promise<AdSlotInfo[]> {
  const params = new URLSearchParams({ movieId, profileId });
  if (date) params.set("date", date);

  const response = await fetch(`/api/ads/decisions?${params.toString()}`);
  const data = (await response.json()) as DecisionsResponse;
  if (!response.ok || !data.success || !data.slots) {
    throw new Error(data.error || `Ad decisions failed (${response.status})`);
  }
  return data.slots;
}

/** Fire-and-forget analytics; failures never interrupt playback. */
export function logAdEvent(payload: AdEventPayload): void {
  fetch("/api/ads/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch((cause: unknown) => console.error("Failed to log ad event", cause));
}

export function findActiveAdSlot(slots: AdSlotInfo[], timelineTime: number): AdSlotInfo | undefined {
  return slots.find((slot) => timelineTime >= slot.startSeconds && timelineTime < slot.endSeconds);
}

export function isBrandedDecision(decision: AdDecision): boolean {
  return (decision.kind === "CAMPAIGN" || decision.kind === "PUBLIC_SERVICE") && Boolean(decision.campaign);
}

/** Short human label for what a slot shows. */
export function decisionLabel(decision: AdDecision): string {
  if (decision.kind === "CAMPAIGN" && decision.campaign) return decision.campaign.brandName;
  if (decision.kind === "PUBLIC_SERVICE" && decision.campaign) return `PSA · ${decision.campaign.brandName}`;
  if (decision.kind === "NEUTRAL") return "Neutral artwork";
  return "No ad";
}
