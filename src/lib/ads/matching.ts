import { AdDecision, AdaptiveSlot, Campaign, SceneSafetyProfile, ViewerProfile } from "@/lib/types";
import { evaluateBrandSafety, policyForSlot } from "./brand-safety";

export interface MatchInput {
  slot: AdaptiveSlot;
  profile: ViewerProfile;
  campaigns: readonly Campaign[];
  scene?: SceneSafetyProfile;
  now: Date;
}

const same = (left: string, right: string) => left.trim().toLowerCase() === right.trim().toLowerCase();
const listIncludes = (list: readonly string[], value: string) => list.some((entry) => same(entry, value));

/** Flight dates are inclusive calendar days in UTC. */
export function isCampaignInFlight(campaign: Campaign, now: Date): boolean {
  const day = now.toISOString().slice(0, 10);
  if (campaign.flightStart && day < campaign.flightStart) return false;
  if (campaign.flightEnd && day > campaign.flightEnd) return false;
  return true;
}

export interface TargetingResult {
  matches: boolean;
  score: number;
  reasons: string[];
  mismatch?: string;
}

export function targetCampaign(campaign: Campaign, profile: ViewerProfile): TargetingResult {
  const checks: { list: readonly string[]; value: string; points: number; label: string }[] = [
    { list: campaign.targetCities, value: profile.city, points: 30, label: "city" },
    { list: campaign.targetCountries, value: profile.country, points: 20, label: "country" },
    { list: campaign.targetLocales, value: profile.locale, points: 15, label: "language" },
  ];

  let score = 0;
  const reasons: string[] = [];

  for (const check of checks) {
    if (check.list.length === 0) continue;
    if (!listIncludes(check.list, check.value)) {
      return {
        matches: false,
        score: 0,
        reasons: [],
        mismatch: `Targets ${check.label} ${check.list.join(", ")}; viewer is in ${check.value}`,
      };
    }
    score += check.points;
    reasons.push(`Targets viewers in ${check.value}`);
  }

  if (reasons.length === 0) {
    score += 5;
    reasons.push("Runs in every market");
  }

  return { matches: true, score, reasons };
}

function rejectionFor(input: MatchInput, campaign: Campaign): string | undefined {
  const preference = input.profile.adPreference ?? "standard";
  if (preference === "kids" && !campaign.isPublicService) return "Kids profile: only public-service messages";
  if (!isCampaignInFlight(campaign, input.now)) {
    return `Not running on ${input.now.toISOString().slice(0, 10)} (${campaign.flightStart ?? "…"} to ${campaign.flightEnd ?? "…"})`;
  }
  const targeting = targetCampaign(campaign, input.profile);
  if (!targeting.matches) return targeting.mismatch;
  const safety = evaluateBrandSafety(campaign, input.scene, policyForSlot(input.slot));
  if (!safety.safe) return safety.reasons.join("; ");
  return undefined;
}

function scoreCampaign(input: MatchInput, campaign: Campaign): number {
  const targeting = targetCampaign(campaign, input.profile);
  const publicServicePenalty = campaign.isPublicService && input.profile.adPreference !== "kids" ? 50 : 0;
  return targeting.score + campaign.bidWeight * 10 - publicServicePenalty;
}

const NEUTRAL = (slotId: string, reasons: string[], rejected: AdDecision["rejected"]): AdDecision => ({
  slotId,
  kind: "NEUTRAL",
  adKey: "neutral",
  reasons,
  rejected,
});

/**
 * Picks what the ad surface in this slot shows for this viewer, and why.
 * Pure: same inputs → same decision, so caches and the player agree.
 */
export function selectAd(input: MatchInput): AdDecision {
  const { slot, profile } = input;

  if (slot.type !== "ADSPOT_BILLBOARD") {
    return { slotId: slot.id, kind: "NONE", adKey: "none", reasons: ["Not an ad surface"], rejected: [] };
  }

  if (profile.adPreference === "ad_free") {
    return NEUTRAL(slot.id, ["Ad-free plan: the billboard shows neutral artwork"], []);
  }

  const rejected: AdDecision["rejected"] = [];
  const eligible: { campaign: Campaign; score: number }[] = [];

  for (const campaign of input.campaigns) {
    const reason = rejectionFor(input, campaign);
    if (reason) {
      rejected.push({ campaignId: campaign.id, brandName: campaign.brandName, reason });
    } else {
      eligible.push({ campaign, score: scoreCampaign(input, campaign) });
    }
  }

  const winner = [...eligible].sort(
    (left, right) => right.score - left.score || left.campaign.id.localeCompare(right.campaign.id),
  )[0];

  if (!winner) {
    return NEUTRAL(slot.id, ["No campaign fits this viewer and scene, so the billboard shows neutral artwork"], rejected);
  }

  const { campaign } = winner;
  const targeting = targetCampaign(campaign, profile);
  const safety = evaluateBrandSafety(campaign, input.scene, policyForSlot(slot));
  const reasons = [
    ...targeting.reasons,
    ...(profile.languageLabel ? [`Copy rendered in ${profile.languageLabel}`] : []),
    ...(campaign.seasonLabel ? [`${campaign.seasonLabel} campaign is running now`] : []),
    ...safety.reasons,
  ];

  return {
    slotId: slot.id,
    kind: campaign.isPublicService ? "PUBLIC_SERVICE" : "CAMPAIGN",
    adKey: campaign.id,
    campaign,
    score: winner.score,
    reasons,
    rejected,
  };
}
