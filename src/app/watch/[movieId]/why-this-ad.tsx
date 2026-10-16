"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";
import { AdSlotInfo, decisionLabel } from "./ad-client";

interface WhyThisAdProps {
  slot: AdSlotInfo;
}

function headlineFor(slot: AdSlotInfo): string {
  const { decision } = slot;
  if (decision.kind === "NEUTRAL" || decision.kind === "NONE") return "Ad-free / neutral artwork";
  return decisionLabel(decision);
}

/** "Why this ad?" chip shown top-right during ad slots; expands into an explanation panel. */
export function WhyThisAd({ slot }: WhyThisAdProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { decision, scene, cut } = slot;
  const exposure = cut?.exposure;

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="absolute top-4 right-4 z-30 inline-flex items-center gap-1.5 rounded-full border border-[#F2A541]/50 bg-black/70 px-3 py-1 text-xs text-[#F2A541] hover:bg-black/85 transition-colors"
      >
        <Info className="size-3.5" />
        Why this ad?
      </button>
    );
  }

  return (
    <div className="absolute top-4 right-4 z-30 w-80 max-w-[calc(100%-2rem)] max-h-[calc(100%-6rem)] overflow-y-auto rounded-lg border border-[#F2A541]/40 bg-zinc-950/95 p-4 text-xs text-slate-300 shadow-xl">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-[#F2A541]">Why this ad?</div>
          <div className="text-sm font-semibold text-slate-100 mt-0.5">{headlineFor(slot)}</div>
          {decision.campaign?.seasonLabel && <div className="text-[11px] text-[#F2A541] mt-0.5">{decision.campaign.seasonLabel}</div>}
        </div>
        <button type="button" onClick={() => setIsOpen(false)} aria-label="Close" className="text-slate-500 hover:text-slate-200">
          <X className="size-4" />
        </button>
      </div>

      {decision.reasons.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5 list-disc pl-4">
          {decision.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}

      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-zinc-800 pt-3">
        <dt className="text-slate-500">Scene mood</dt>
        <dd className="text-slate-200">{scene.mood}</dd>
        {exposure && (
          <>
            <dt className="text-slate-500">Exposure</dt>
            <dd className="text-slate-200">
              {Math.round(exposure.score)}/100 · {Math.round(exposure.frameShare * 100)}% of frame
              {!exposure.withinProminenceCap && <span className="text-red-300"> · over cap</span>}
            </dd>
          </>
        )}
      </dl>

      {decision.rejected.length > 0 && (
        <div className="mt-3 border-t border-zinc-800 pt-3">
          <div className="text-slate-500 mb-1.5">Not shown</div>
          <ul className="flex flex-col gap-1">
            {decision.rejected.map((entry) => (
              <li key={entry.campaignId}>
                <span className="text-slate-200">{entry.brandName}</span>
                <span className="text-slate-500"> — {entry.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
