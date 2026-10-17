"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";

export type StatusTone = "info" | "success" | "error";

export interface Status {
  tone: StatusTone;
  text: string;
}

interface StatusMessageProps {
  status: Status | null;
  onDismiss?: () => void;
  className?: string;
}

const TONE_CLASSES: Record<StatusTone, string> = {
  info: "border-azure/30 bg-azure/10 text-blue-100",
  success: "border-mint/30 bg-mint/10 text-emerald-100",
  error: "border-red-400/35 bg-red-500/10 text-red-100",
};

const ICON_CLASSES: Record<StatusTone, string> = {
  info: "text-azure",
  success: "text-mint",
  error: "text-red-300",
};

const TONE_ICONS = { info: Info, success: CheckCircle2, error: TriangleAlert } as const;

/** Inline replacement for alert(): announces politely, errors assertively. */
export function StatusMessage({ status, onDismiss, className = "" }: StatusMessageProps) {
  return (
    <AnimatePresence initial={false} mode="wait">
      {status && <StatusBody key={`${status.tone}:${status.text}`} status={status} onDismiss={onDismiss} className={className} />}
    </AnimatePresence>
  );
}

function StatusBody({ status, onDismiss, className }: { status: Status; onDismiss?: () => void; className: string }) {
  const Icon = TONE_ICONS[status.tone];
  return (
    <motion.div
      role={status.tone === "error" ? "alert" : "status"}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm backdrop-blur-md ${TONE_CLASSES[status.tone]} ${className}`}
    >
      <Icon className={`mt-0.5 size-4 shrink-0 ${ICON_CLASSES[status.tone]}`} aria-hidden />
      <span className="flex-1 leading-relaxed">{status.text}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md p-0.5 opacity-70 outline-none transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-amber/60"
          aria-label="Dismiss message"
        >
          <X className="size-4" />
        </button>
      )}
    </motion.div>
  );
}
