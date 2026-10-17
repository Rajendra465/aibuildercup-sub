"use client";

import type { AdaptiveSlot, ViewerProfile } from "@/lib/types";
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
    <div className="border-y border-amber/20 bg-linear-to-b from-amber/[0.05] to-transparent">
      <p className="flex items-center gap-2 px-4 pt-3 text-[10px] font-semibold tracking-[0.25em] text-amber/80 uppercase sm:px-5">
        <span className="size-1.5 rounded-full bg-amber shadow-[0_0_8px_rgb(242_165_65/0.9)]" aria-hidden="true" />
        Ad spot controls
      </p>
      <BrandSafetyPanel movieId={movieId} slotId={slot.id} />
      <AdPolicyPanel key={slot.id} slot={slot} />
      <WhoSeesWhatPanel movieId={movieId} slotId={slot.id} profiles={profiles} />
    </div>
  );
}
