"use client";

import type { AdaptiveSlot, ViewerProfile } from "@/lib/types";
import { AD_ACCENT } from "./director-api";
import { AdPolicyPanel } from "./ad-policy-panel";
import { BrandSafetyPanel } from "./brand-safety-panel";
import { WhoSeesWhatPanel } from "./who-sees-what-panel";

interface AdSlotInspectorProps {
  movieId: string;
  slot: AdaptiveSlot;
  profiles: ViewerProfile[];
}

/** Director-side ad controls shown for ADSPOT_BILLBOARD slots. */
export function AdSlotInspector({ movieId, slot, profiles }: AdSlotInspectorProps) {
  return (
    <div className="flex flex-col gap-5 rounded-lg border p-3" style={{ borderColor: `${AD_ACCENT}55` }}>
      <BrandSafetyPanel movieId={movieId} slotId={slot.id} />
      <div className="border-t border-zinc-800" />
      <AdPolicyPanel key={slot.id} slot={slot} />
      <div className="border-t border-zinc-800" />
      <WhoSeesWhatPanel movieId={movieId} slotId={slot.id} profiles={profiles} />
    </div>
  );
}
