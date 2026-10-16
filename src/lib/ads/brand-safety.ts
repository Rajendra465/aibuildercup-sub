import { AdCategory, AdaptiveSlot, Campaign, SafetyVerdict, SceneSafetyProfile, SlotAdPolicy } from "@/lib/types";

export const DEFAULT_AD_POLICY: SlotAdPolicy = {
  blockedCategories: [],
  maxProminence: 0.35,
  requireApproval: false,
};

export function policyForSlot(slot: AdaptiveSlot): SlotAdPolicy {
  return {
    ...DEFAULT_AD_POLICY,
    ...(slot.visualConstraints.maxProminence ? { maxProminence: slot.visualConstraints.maxProminence } : {}),
    ...slot.adPolicy,
  };
}

/** Scene contexts where a category would be tone-deaf, even if the brand didn't say so. */
const CATEGORY_CONFLICTS: Partial<Record<AdCategory, string[]>> = {
  travel: ["plane crash", "crash", "disaster", "hijack", "accident"],
  automotive: ["car crash", "crash", "accident", "drunk driving"],
  alcohol: ["children", "school", "driving", "addiction", "minors"],
  gambling: ["children", "school", "addiction", "debt"],
  food_beverage: ["illness", "poison", "vomit", "funeral"],
  finance: ["robbery", "fraud", "bankruptcy", "heist"],
  health: ["death", "funeral", "overdose"],
  entertainment: ["funeral", "grief"],
};

/** Words that mark a scene as sensitive when found in director notes. */
const SENSITIVE_KEYWORDS = [
  "crash", "accident", "death", "funeral", "grief", "violence", "blood", "weapon", "gun", "murder",
  "robbery", "heist", "fraud", "children", "school", "hospital", "illness", "disaster", "fire", "war",
];

const normalize = (value: string) => value.trim().toLowerCase();

function overlaps(contexts: readonly string[], needles: readonly string[]): string | undefined {
  const normalizedContexts = contexts.map(normalize);
  return needles
    .map(normalize)
    .find((needle) => normalizedContexts.some((context) => context.includes(needle) || needle.includes(context)));
}

export function evaluateBrandSafety(
  campaign: Campaign,
  scene: SceneSafetyProfile | undefined,
  policy: SlotAdPolicy,
): SafetyVerdict {
  if (policy.blockedCategories.includes(campaign.category)) {
    return { safe: false, reasons: [`The director blocked ${campaign.category.replace("_", " ")} ads in this scene`] };
  }

  if (!scene) {
    return { safe: true, reasons: ["No scene risks recorded"] };
  }

  const sceneContexts = [...scene.sensitiveContexts, ...scene.themes];

  const brandConflict = overlaps(sceneContexts, campaign.avoidContexts);
  if (brandConflict) {
    return { safe: false, reasons: [`${campaign.brandName} avoids "${brandConflict}", and this scene contains it`] };
  }

  const categoryConflict = overlaps(scene.sensitiveContexts, CATEGORY_CONFLICTS[campaign.category] ?? []);
  if (categoryConflict) {
    return {
      safe: false,
      reasons: [`A ${campaign.category.replace("_", " ")} ad next to "${categoryConflict}" would be tone-deaf`],
    };
  }

  return { safe: true, reasons: [`Scene mood "${scene.mood}" is a safe fit`] };
}

/** Cheap, deterministic scene read from the director's own notes. Used without Gemini. */
export function heuristicSceneProfile(slot: AdaptiveSlot, now: Date = new Date()): SceneSafetyProfile {
  const text = [slot.label, slot.narrativePurpose, ...slot.immutableFacts, ...slot.prohibitedChanges]
    .join(" ")
    .toLowerCase();

  const sensitiveContexts = SENSITIVE_KEYWORDS.filter((keyword) => new RegExp(`\\b${keyword}`).test(text));
  const mood = sensitiveContexts.length
    ? "tense"
    : /night|rain|dark|storm/.test(text)
      ? "moody"
      : /festival|party|celebrat|sunny|market/.test(text)
        ? "upbeat"
        : "neutral";

  return {
    slotId: slot.id,
    mood,
    themes: [],
    sensitiveContexts,
    summary: `Estimated from director notes: ${slot.narrativePurpose || slot.label}`,
    source: "heuristic",
    analyzedAt: now.toISOString(),
  };
}
