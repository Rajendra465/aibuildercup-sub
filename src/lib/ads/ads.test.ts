import { describe, expect, it } from "vitest";
import { AdEvent, AdaptiveSlot, Campaign, SceneSafetyProfile, ViewerProfile } from "@/lib/types";
import { isCampaignInFlight, selectAd, targetCampaign } from "./matching";
import { evaluateBrandSafety, heuristicSceneProfile, policyForSlot } from "./brand-safety";
import { scoreExposure } from "./exposure";
import { heuristicCandidates, parseScoutCandidates } from "./slot-scout";
import { summarizeEvents } from "./analytics";
import { buildAudioScript, pcmToWav } from "./audio-ad";
import { buildAdInstruction } from "./ad-prompt";
import { seedCampaigns } from "./seed-campaigns";

const slot = (overrides: Partial<AdaptiveSlot> = {}): AdaptiveSlot => ({
  id: "slot-1",
  movieId: "movie-1",
  label: "Street billboard",
  type: "ADSPOT_BILLBOARD",
  startSeconds: 0,
  endSeconds: 5,
  generationLeadSeconds: 30,
  generationDeadlineSeconds: 5,
  narrativePurpose: "A quiet street at dusk",
  editableFields: ["the billboard"],
  immutableFacts: [],
  prohibitedChanges: [],
  visualConstraints: {
    preserveDuration: true, preserveCameraMotion: true, preserveLighting: true,
    preserveCharacters: true, preserveForegroundObjects: true,
  },
  supportedLocales: [],
  canonicalFallbackUrl: "/media/fallbacks/slot-1.mp4",
  generationStrategy: "VIDEO_EDIT",
  isEnabled: true,
  ...overrides,
});

const viewer = (overrides: Partial<ViewerProfile> = {}): ViewerProfile => ({
  id: "tokyo", displayName: "Aiko", city: "Tokyo", country: "Japan", locale: "ja-JP", languageLabel: "Japanese",
  ...overrides,
});

const campaign = (overrides: Partial<Campaign> = {}): Campaign => ({
  id: "c1", brandName: "Brand", productName: "Thing", tagline: "Buy it", category: "food_beverage",
  isPublicService: false, brandColors: [], ctaLabel: "Shop", landingUrl: "https://example.com",
  targetCities: [], targetCountries: [], targetLocales: [], avoidContexts: [], bidWeight: 1,
  createdAt: "2026-10-01T00:00:00.000Z",
  ...overrides,
});

const scene = (overrides: Partial<SceneSafetyProfile> = {}): SceneSafetyProfile => ({
  slotId: "slot-1", mood: "calm", themes: [], sensitiveContexts: [], summary: "", source: "gemini",
  analyzedAt: "2026-10-16T00:00:00.000Z",
  ...overrides,
});

const OCT = new Date("2026-10-16T12:00:00Z");
const DEC = new Date("2026-12-10T12:00:00Z");

describe("targeting", () => {
  it("matches an untargeted campaign everywhere", () => {
    expect(targetCampaign(campaign(), viewer())).toMatchObject({ matches: true, reasons: ["Runs in every market"] });
  });

  it("rejects a viewer outside the targeted country with a reason", () => {
    const result = targetCampaign(campaign({ targetCountries: ["India"] }), viewer());
    expect(result.matches).toBe(false);
    expect(result.mismatch).toContain("Japan");
  });

  it("scores city targeting above country targeting", () => {
    const city = targetCampaign(campaign({ targetCities: ["tokyo"] }), viewer()).score;
    const country = targetCampaign(campaign({ targetCountries: ["Japan"] }), viewer()).score;
    expect(city).toBeGreaterThan(country);
  });
});

describe("flight dates (seasonal re-versioning)", () => {
  const festive = campaign({ flightStart: "2026-12-01", flightEnd: "2026-12-31" });
  it("is off before the flight", () => expect(isCampaignInFlight(festive, OCT)).toBe(false));
  it("is on during the flight", () => expect(isCampaignInFlight(festive, DEC)).toBe(true));
  it("treats the end date as inclusive", () =>
    expect(isCampaignInFlight(festive, new Date("2026-12-31T23:00:00Z"))).toBe(true));
});

describe("brand safety", () => {
  it("blocks categories the director blocked", () => {
    const verdict = evaluateBrandSafety(campaign({ category: "alcohol" }), scene(), {
      blockedCategories: ["alcohol"], maxProminence: 0.3, requireApproval: false,
    });
    expect(verdict.safe).toBe(false);
    expect(verdict.reasons[0]).toContain("director blocked");
  });

  it("blocks a brand next to a context it avoids", () => {
    const verdict = evaluateBrandSafety(
      campaign({ brandName: "SkyHop", avoidContexts: ["plane crash"] }),
      scene({ sensitiveContexts: ["plane crash"] }),
      policyForSlot(slot()),
    );
    expect(verdict).toMatchObject({ safe: false });
    expect(verdict.reasons[0]).toContain("SkyHop");
  });

  it("blocks tone-deaf category pairings even if the brand did not list them", () => {
    const verdict = evaluateBrandSafety(campaign({ category: "travel" }), scene({ sensitiveContexts: ["crash"] }), policyForSlot(slot()));
    expect(verdict.safe).toBe(false);
  });

  it("passes a clean scene", () => {
    expect(evaluateBrandSafety(campaign(), scene(), policyForSlot(slot())).safe).toBe(true);
  });

  it("reads sensitive contexts from director notes without Gemini", () => {
    const profile = heuristicSceneProfile(slot({ narrativePurpose: "Aftermath of a car crash at night" }));
    expect(profile.sensitiveContexts).toContain("crash");
    expect(profile.mood).toBe("tense");
  });

  it("uses the slot's maxProminence when no policy is set", () => {
    const withCap = slot({ visualConstraints: { ...slot().visualConstraints, maxProminence: 0.15 } });
    expect(policyForSlot(withCap).maxProminence).toBe(0.15);
  });
});

describe("selectAd", () => {
  const base = { slot: slot(), scene: scene(), now: OCT };

  it("returns NONE for non-ad slots", () => {
    expect(selectAd({ ...base, slot: slot({ type: "CITY_ESTABLISHING" }), profile: viewer(), campaigns: seedCampaigns }).kind).toBe("NONE");
  });

  it("picks the locally targeted brand for each viewer", () => {
    const tokyo = selectAd({ ...base, profile: viewer(), campaigns: seedCampaigns });
    const vizag = selectAd({
      ...base, campaigns: seedCampaigns,
      profile: viewer({ city: "Visakhapatnam", country: "India", locale: "te-IN", languageLabel: "Telugu" }),
    });
    expect(tokyo.campaign?.id).toBe("sakura-cold-brew");
    expect(vizag.campaign?.id).toBe("monsoon-brew-diwali");
    expect(vizag.reasons).toContain("Diwali campaign is running now");
  });

  it("swaps in a seasonal campaign when its flight starts", () => {
    const paris = viewer({ city: "Paris", country: "France", locale: "fr-FR", languageLabel: "French" });
    expect(selectAd({ ...base, profile: paris, campaigns: seedCampaigns }).campaign?.id).not.toBe("winter-lights-paris");
    expect(selectAd({ ...base, now: DEC, profile: paris, campaigns: seedCampaigns }).campaign?.id).toBe("winter-lights-paris");
  });

  it("shows only public-service messages to kids profiles", () => {
    const decision = selectAd({ ...base, profile: viewer({ adPreference: "kids" }), campaigns: seedCampaigns });
    expect(decision.kind).toBe("PUBLIC_SERVICE");
    expect(decision.rejected.length).toBeGreaterThan(0);
  });

  it("shows neutral art on ad-free profiles", () => {
    expect(selectAd({ ...base, profile: viewer({ adPreference: "ad_free" }), campaigns: seedCampaigns })).toMatchObject({
      kind: "NEUTRAL", adKey: "neutral",
    });
  });

  it("falls back to neutral art when every campaign is rejected, listing why", () => {
    const decision = selectAd({ ...base, profile: viewer(), campaigns: [campaign({ targetCountries: ["India"] })] });
    expect(decision.kind).toBe("NEUTRAL");
    expect(decision.rejected[0].reason).toContain("Japan");
  });

  it("is deterministic on ties", () => {
    const campaigns = [campaign({ id: "b" }), campaign({ id: "a" })];
    expect(selectAd({ ...base, profile: viewer(), campaigns }).adKey).toBe("a");
  });
});

describe("exposure score", () => {
  it("rewards size, time on screen and legibility", () => {
    const strong = scoreExposure({ frameShare: 0.25, visibleSeconds: 5, slotSeconds: 5, legibility: 1 }, 0.3, "gemini");
    const weak = scoreExposure({ frameShare: 0.05, visibleSeconds: 1, slotSeconds: 5, legibility: 0.2 }, 0.3, "gemini");
    expect(strong.score).toBe(100);
    expect(weak.score).toBeLessThan(40);
  });

  it("flags ads larger than the director's cap", () => {
    expect(scoreExposure({ frameShare: 0.5, visibleSeconds: 5, slotSeconds: 5, legibility: 1 }, 0.3, "gemini").withinProminenceCap).toBe(false);
  });

  it("clamps bad model output", () => {
    const report = scoreExposure({ frameShare: 4, visibleSeconds: 99, slotSeconds: 5, legibility: Number.NaN }, 1, "gemini");
    expect(report).toMatchObject({ frameShare: 1, visibleSeconds: 5, legibility: 0 });
  });
});

describe("slot scout parsing", () => {
  const movie = { id: "m", durationSeconds: 20 };

  it("keeps valid candidates, sorted by score, clamped to the film", () => {
    const parsed = parseScoutCandidates({
      candidates: [
        { startSeconds: 2, endSeconds: 6, surfaceType: "screen", description: "TV in the bar", placementScore: 60 },
        { startSeconds: 15, endSeconds: 40, surfaceType: "billboard", description: "Roadside billboard", placementScore: 92 },
      ],
    }, movie);
    expect(parsed.map((candidate) => candidate.description)).toEqual(["Roadside billboard", "TV in the bar"]);
    expect(parsed[0].endSeconds).toBe(20);
  });

  it("drops entries that are too short, undescribed or malformed", () => {
    const parsed = parseScoutCandidates([
      { startSeconds: 1, endSeconds: 1.2, description: "blink" },
      { startSeconds: 1, endSeconds: 5 },
      "nonsense",
      { startSeconds: 3, endSeconds: 8, surfaceType: "spaceship", description: "Bus side panel", placementScore: 300 },
    ], movie);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ surfaceType: "other", placementScore: 100 });
  });

  it("offers review windows when Gemini is unavailable", () => {
    const candidates = heuristicCandidates(movie);
    expect(candidates).toHaveLength(3);
    expect(candidates.every((candidate) => candidate.source === "heuristic" && candidate.endSeconds <= 20)).toBe(true);
  });
});

describe("analytics", () => {
  const event = (type: AdEvent["type"], overrides: Partial<AdEvent> = {}): AdEvent => ({
    id: Math.random().toString(), type, campaignId: "c1", movieId: "m", slotId: "s", profileId: "p",
    city: "Tokyo", locale: "ja-JP", at: "2026-10-16T00:00:00.000Z", ...overrides,
  });

  it("rolls up impressions, clicks, click rate, exposure and cities", () => {
    const summary = summarizeEvents([
      event("IMPRESSION", { exposureScore: 80 }),
      event("IMPRESSION", { exposureScore: 60, city: "Osaka" }),
      event("PAUSE_VIEW"),
      event("CLICK"),
    ], [campaign()]);
    expect(summary.totals).toEqual({ impressions: 2, pauseViews: 1, clicks: 1, audioPlays: 0 });
    expect(summary.campaigns[0]).toMatchObject({ brandName: "Brand", clickRate: 0.5, avgExposure: 70, byCity: { Tokyo: 1, Osaka: 1 } });
  });
});

describe("audio ads", () => {
  it("asks for the viewer's language", () => {
    const script = buildAudioScript(campaign({ audioScript: "Fresh coffee now" }), viewer());
    expect(script.line).toBe("Fresh coffee now");
    expect(script.direction).toContain("Japanese");
  });

  it("wraps PCM in a valid WAV header", () => {
    const wav = pcmToWav(Buffer.alloc(100));
    expect(wav.subarray(0, 4).toString()).toBe("RIFF");
    expect(wav.readUInt32LE(40)).toBe(100);
    expect(wav.length).toBe(144);
  });
});

describe("ad prompt", () => {
  it("asks for neutral art with no text on ad-free cuts", () => {
    const text = buildAdInstruction(slot(), viewer(), { slotId: "slot-1", kind: "NEUTRAL", adKey: "neutral", reasons: [], rejected: [] });
    expect(text).toContain("No brand names");
  });

  it("includes brand, language and the prominence cap for campaigns", () => {
    const decision = selectAd({ slot: slot(), profile: viewer(), campaigns: seedCampaigns, scene: scene(), now: OCT });
    const text = buildAdInstruction(slot(), viewer(), decision);
    expect(text).toContain("Sakura Cold Brew");
    expect(text).toContain("Japanese");
    expect(text).toContain("35% of the frame");
  });

  it("is empty for non-ad slots", () => {
    expect(buildAdInstruction(slot({ type: "LOCALIZED_PROP" }), viewer(), undefined)).toBe("");
  });
});
