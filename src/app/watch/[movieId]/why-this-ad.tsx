"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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

  return (
    <div className="absolute top-4 right-4 z-30 flex max-h-[calc(100%-6rem)] max-w-[calc(100%-2rem)] justify-end">
      <AnimatePresence mode="wait" initial={false}>
        {!isOpen ? (
          <motion.button
            key="why-chip"
            type="button"
            onClick={() => setIsOpen(true)}
            aria-expanded={false}
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber/50 bg-black/45 px-3 py-1.5 text-xs font-medium text-amber shadow-[0_0_24px_-6px_rgb(242_165_65/0.7)] backdrop-blur-xl transition-colors hover:bg-black/65 focus-visible:ring-3 focus-visible:ring-amber/40 focus-visible:outline-none"
          >
            <span className="relative flex size-2" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-amber" />
            </span>
            <Info className="size-3.5" aria-hidden="true" />
            Why this ad?
          </motion.button>
        ) : (
          <motion.div
            key="why-panel"
            role="region"
            aria-label="Why this ad?"
            initial={{ opacity: 0, x: 24, filter: "blur(6px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: 24, filter: "blur(6px)" }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="glass-strong w-80 max-w-full overflow-y-auto rounded-2xl p-4 text-xs text-white/75"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[10px] font-semibold tracking-[0.2em] text-amber uppercase">Why this ad?</div>
                <div className="mt-1 text-sm font-semibold text-white">{headlineFor(slot)}</div>
                {decision.campaign?.seasonLabel && <div className="mt-0.5 text-[11px] text-amber">{decision.campaign.seasonLabel}</div>}
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <X className="size-4" />
              </button>
            </div>

            {decision.reasons.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1.5">
                {decision.reasons.map((reason, index) => (
                  <motion.li
                    key={reason}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 + index * 0.05 }}
                    className="flex gap-2"
                  >
                    <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber" />
                    <span>{reason}</span>
                  </motion.li>
                ))}
              </ul>
            )}

            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-white/10 pt-3">
              <dt className="text-muted-foreground">Scene mood</dt>
              <dd className="text-white">{scene.mood}</dd>
              {exposure && (
                <>
                  <dt className="text-muted-foreground">Exposure</dt>
                  <dd className="text-white">
                    {Math.round(exposure.score)}/100 · {Math.round(exposure.frameShare * 100)}% of frame
                    {!exposure.withinProminenceCap && <span className="text-red-300"> · over cap</span>}
                  </dd>
                </>
              )}
            </dl>
            {exposure && (
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-amber to-violet"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, Math.max(0, exposure.score))}%` }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            )}

            {decision.rejected.length > 0 && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <div className="mb-1.5 text-muted-foreground">Not shown</div>
                <ul className="flex flex-col gap-1">
                  {decision.rejected.map((entry) => (
                    <li key={entry.campaignId}>
                      <span className="text-white">{entry.brandName}</span>
                      <span className="text-muted-foreground"> — {entry.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
