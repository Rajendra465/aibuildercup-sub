"use client";

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
  info: "border-zinc-700 bg-zinc-950 text-slate-300",
  success: "border-emerald-800 bg-emerald-950/40 text-emerald-200",
  error: "border-red-900 bg-red-950/40 text-red-200",
};

const TONE_ICONS = { info: Info, success: CheckCircle2, error: TriangleAlert } as const;

/** Inline replacement for alert(): announces politely, errors assertively. */
export function StatusMessage({ status, onDismiss, className = "" }: StatusMessageProps) {
  if (!status) return null;
  const Icon = TONE_ICONS[status.tone];
  return (
    <div
      role={status.tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${TONE_CLASSES[status.tone]} ${className}`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span className="flex-1">{status.text}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="opacity-70 hover:opacity-100" aria-label="Dismiss message">
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
