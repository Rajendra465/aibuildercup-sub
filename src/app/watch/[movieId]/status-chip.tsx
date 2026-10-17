"use client";

import { AnimatePresence, motion } from "framer-motion";

type StatusTone = "ready" | "fallback" | "failed" | "progress";

const TONE_CLASS: Record<StatusTone, { chip: string; dot: string }> = {
  ready: { chip: "border-mint/40 bg-mint/10 text-mint", dot: "bg-mint" },
  fallback: { chip: "border-amber/40 bg-amber/10 text-amber", dot: "bg-amber" },
  failed: { chip: "border-red-400/40 bg-red-500/10 text-red-300", dot: "bg-red-400" },
  progress: { chip: "border-azure/40 bg-azure/10 text-sky-300", dot: "bg-sky-300" },
};

function toneFor(status: string): StatusTone {
  if (status === "READY") return "ready";
  if (status === "FALLBACK") return "fallback";
  if (status === "FAILED" || status === "EXPIRED" || status === "CANCELLED") return "failed";
  return "progress";
}

/** Glass status chip; in-progress states pulse, label changes cross-fade. */
export function StatusChip({ status, label }: { status: string; label?: string }) {
  const tone = toneFor(status);
  const classes = TONE_CLASS[tone];

  return (
    <motion.span
      layout
      className={`inline-flex h-6 shrink-0 items-center gap-1.5 overflow-hidden rounded-full border px-2.5 text-[11px] font-medium tracking-wide whitespace-nowrap ${classes.chip}`}
    >
      <span className="relative flex size-1.5" aria-hidden="true">
        {tone === "progress" && <span className={`absolute inline-flex size-full animate-ping rounded-full opacity-75 ${classes.dot}`} />}
        <span className={`relative inline-flex size-1.5 rounded-full ${classes.dot}`} />
      </span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={label ?? status}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          {label ?? status}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}
