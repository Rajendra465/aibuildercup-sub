import { AdDecision, AdaptiveSlot, ViewerProfile } from "@/lib/types";
import { policyForSlot } from "./brand-safety";

/**
 * Turns an ad decision into instructions for the Gemini Omni video edit.
 * Returns "" for non-ad slots so the normal localization prompt is used.
 */
export function buildAdInstruction(slot: AdaptiveSlot, profile: ViewerProfile, decision: AdDecision | undefined): string {
  if (slot.type !== "ADSPOT_BILLBOARD" || !decision || decision.kind === "NONE") return "";

  const policy = policyForSlot(slot);
  const prominence = `The ad must never cover more than ${Math.round(policy.maxProminence * 100)}% of the frame.`;
  const keep =
    "Keep it diegetic: it must sit on the existing billboard/ad surface with matching perspective, lighting, grain and motion blur. " +
    "Do not change camera motion, people, foreground action, timing or the rest of the environment.";

  if (decision.kind === "NEUTRAL") {
    return `Ad surface requirements:
- Replace any advertising on the ad surface with tasteful neutral artwork (an abstract mural or landscape poster).
- No brand names, logos, products, prices or text of any kind.
- ${prominence}
- ${keep}`;
  }

  const campaign = decision.campaign!;
  const colors = campaign.brandColors.length ? `Use the brand colors ${campaign.brandColors.join(" and ")}.` : "";
  const assets = [
    campaign.logoUrl ? "the attached logo image (reproduce it faithfully, do not redraw it)" : "",
    campaign.productImageUrl ? "the attached product photo" : "",
  ].filter(Boolean);

  return `Ad surface requirements:
- Show a ${campaign.isPublicService ? "public-service poster" : "brand advertisement"} for "${campaign.brandName}" (${campaign.productName}).
- Headline, translated naturally into ${profile.languageLabel} (${profile.locale}) using its native script: "${campaign.tagline}".
- Keep the brand name "${campaign.brandName}" exactly as written.
${assets.length ? `- Use ${assets.join(" and ")}.\n` : ""}- ${colors} Design it like a professional out-of-home ad for viewers in ${profile.city}, ${profile.country}.
- ${prominence}
- ${keep}`;
}
