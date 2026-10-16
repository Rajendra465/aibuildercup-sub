import { AdDecision, AdEvent, AdaptiveSlot, Campaign, SceneSafetyProfile, ScoutCandidate, ViewerProfile } from "@/lib/types";
import { readCollection, upsertInCollection, writeCollection, appendToCollection } from "@/lib/store/json-store";
import { publicMediaPathFromUrl } from "@/lib/data/studio-store";
import { ANALYSIS_MODEL, extractJson, getGenAI, uploadVideoForAnalysis } from "@/lib/ai/genai-client";
import { seedCampaigns } from "./seed-campaigns";
import { heuristicSceneProfile } from "./brand-safety";
import { selectAd } from "./matching";
import fs from "fs";

const CAMPAIGNS = "campaigns";
const EVENTS = "ad-events";
const SCENES = "scene-safety";
const SCOUT = "scout";

// --- Campaigns ---------------------------------------------------------------

export const listCampaigns = (): Campaign[] => readCollection<Campaign>(CAMPAIGNS, seedCampaigns);

export const getCampaign = (id: string): Campaign | undefined => listCampaigns().find((campaign) => campaign.id === id);

export function saveCampaign(campaign: Campaign): Campaign {
  upsertInCollection(CAMPAIGNS, campaign, seedCampaigns);
  return campaign;
}

export function deleteCampaign(id: string): boolean {
  const current = listCampaigns();
  const next = current.filter((campaign) => campaign.id !== id);
  writeCollection(CAMPAIGNS, next);
  return next.length !== current.length;
}

// --- Events ------------------------------------------------------------------

export const listEvents = (): AdEvent[] => readCollection<AdEvent>(EVENTS);

export function recordEvent(event: AdEvent): void {
  appendToCollection(EVENTS, event);
}

// --- Scene safety ------------------------------------------------------------

export function cachedSceneProfile(slot: AdaptiveSlot): SceneSafetyProfile {
  return readCollection<SceneSafetyProfile & { id: string }>(SCENES).find((scene) => scene.slotId === slot.id)
    ?? heuristicSceneProfile(slot);
}

/** Runs Gemini scene analysis once per slot and caches it. Falls back to the heuristic read. */
export async function ensureSceneProfile(slot: AdaptiveSlot, force = false): Promise<SceneSafetyProfile> {
  const cached = readCollection<SceneSafetyProfile & { id: string }>(SCENES).find((scene) => scene.slotId === slot.id);
  if (cached && !force) return cached;

  const ai = getGenAI();
  const clipPath = publicMediaPathFromUrl(slot.canonicalFallbackUrl);
  if (!ai || !process.env.GEMINI_API_KEY || !fs.existsSync(clipPath)) return heuristicSceneProfile(slot);

  try {
    const video = await uploadVideoForAnalysis(ai, clipPath, `scene-${slot.id}`);
    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: [{
        role: "user",
        parts: [
          { fileData: { fileUri: video.uri, mimeType: video.mimeType } },
          {
            text: `You are a brand-safety reviewer. Director notes for this scene: "${slot.narrativePurpose}".
Watch the clip and return ONLY JSON: {"mood": string (one or two words), "themes": string[] (what the scene is about),
"sensitiveContexts": string[] (anything a brand might not want to sit next to: violence, accidents, death, grief,
children, alcohol, crime, disaster, illness...; empty if none), "summary": string (one sentence)}.`,
          },
        ],
      }],
      config: { responseMimeType: "application/json" },
    });

    const raw = extractJson(response.text ?? "") as Partial<SceneSafetyProfile>;
    const list = (value: unknown) => (Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : []);
    const profile: SceneSafetyProfile & { id: string } = {
      id: slot.id,
      slotId: slot.id,
      mood: typeof raw.mood === "string" ? raw.mood : "neutral",
      themes: list(raw.themes),
      sensitiveContexts: list(raw.sensitiveContexts).map((entry) => entry.toLowerCase()),
      summary: typeof raw.summary === "string" ? raw.summary : "",
      source: "gemini",
      analyzedAt: new Date().toISOString(),
    };
    upsertInCollection(SCENES, profile);
    return profile;
  } catch (error) {
    console.error(`Scene analysis failed for ${slot.id}; using heuristic`, error);
    return heuristicSceneProfile(slot);
  }
}

// --- Slot Scout ----------------------------------------------------------------

export const listScoutCandidates = (movieId: string): ScoutCandidate[] =>
  readCollection<ScoutCandidate>(SCOUT).filter((candidate) => candidate.movieId === movieId);

export function saveScoutCandidates(movieId: string, candidates: readonly ScoutCandidate[]): void {
  const others = readCollection<ScoutCandidate>(SCOUT).filter((candidate) => candidate.movieId !== movieId);
  writeCollection(SCOUT, [...others, ...candidates]);
}

// --- Decisions -----------------------------------------------------------------

/** Parses `?date=YYYY-MM-DD` for seasonal demos; defaults to now. */
export function resolveNow(dateParam: string | null | undefined): Date {
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    const parsed = new Date(`${dateParam}T12:00:00.000Z`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

export function decideForSlot(slot: AdaptiveSlot, profile: ViewerProfile, now: Date): AdDecision {
  return selectAd({ slot, profile, campaigns: listCampaigns(), scene: cachedSceneProfile(slot), now });
}
