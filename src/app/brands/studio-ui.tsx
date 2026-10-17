"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FLIGHT_STATUS_LABELS, type FlightStatus } from "./campaign-utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const SKELETON_COUNT = 6;

const STATUS_STYLES: Readonly<Record<FlightStatus, { pill: string; dot: string }>> = {
  active: { pill: "border-mint/40 bg-mint/15 text-mint", dot: "bg-mint" },
  scheduled: { pill: "border-azure/40 bg-azure/15 text-sky-200", dot: "bg-azure" },
  ended: { pill: "border-white/15 bg-black/40 text-zinc-400", dot: "bg-zinc-500" },
};

interface StatusPillProps {
  status: FlightStatus;
  className?: string;
}

/** Flight status chip; the active state carries a live pulsing dot. */
export function StatusPill({ status, className }: StatusPillProps) {
  const style = STATUS_STYLES[status];
  return (
    <motion.span
      key={status}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: EASE }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium backdrop-blur-md",
        style.pill,
        className,
      )}
    >
      <span className="relative flex size-1.5" aria-hidden="true">
        {status === "active" && (
          <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-75", style.dot)} />
        )}
        <span className={cn("relative inline-flex size-1.5 rounded-full", style.dot)} />
      </span>
      {FLIGHT_STATUS_LABELS[status]}
    </motion.span>
  );
}

interface ToastStackProps {
  notice: string | null;
  error: string | null;
  onDismissNotice: () => void;
  onDismissError: () => void;
}

const toastMotion = {
  initial: { opacity: 0, y: 16, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 8, scale: 0.96, transition: { duration: 0.2 } },
  transition: { duration: 0.35, ease: EASE },
} as const;

/** Floating, animated success / error toasts. The live region is always mounted. */
export function ToastStack({ notice, error, onDismissNotice, onDismissError }: ToastStackProps) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-40 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96"
    >
      <AnimatePresence initial={false}>
        {notice && (
          <motion.div
            key={`notice-${notice}`}
            {...toastMotion}
            className="pointer-events-auto glass-strong flex w-full items-start gap-3 rounded-2xl border-mint/30 px-4 py-3 text-sm text-emerald-100"
          >
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-mint" aria-hidden="true" />
            <span className="flex-1">{notice}</span>
            <button
              type="button"
              onClick={onDismissNotice}
              className="rounded-md px-1.5 text-xs text-emerald-200/80 underline-offset-2 outline-none hover:text-white hover:underline focus-visible:ring-2 focus-visible:ring-mint/60"
            >
              Dismiss
            </button>
          </motion.div>
        )}
        {error && (
          <motion.div
            key={`error-${error}`}
            role="alert"
            {...toastMotion}
            className="pointer-events-auto glass-strong flex w-full items-start gap-3 rounded-2xl border-red-500/40 px-4 py-3 text-sm text-red-200"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-400" aria-hidden="true" />
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={onDismissError}
              aria-label="Dismiss error"
              className="rounded-md p-0.5 text-red-200/80 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-red-400/60"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SkeletonBar({ className }: { className?: string }) {
  return <div className={cn("shimmer-bg animate-shimmer rounded-md bg-white/[0.06]", className)} />;
}

/** Placeholder grid shown while campaigns load. Matches the real card footprint to avoid layout shift. */
export function CampaignSkeletonGrid() {
  return (
    <div role="status" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <span className="sr-only">Loading campaigns…</span>
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <div key={index} aria-hidden="true" className="glass overflow-hidden rounded-2xl">
          <SkeletonBar className="aspect-[16/9] w-full rounded-none" />
          <div className="flex flex-col gap-3 p-4">
            <SkeletonBar className="h-5 w-2/5" />
            <SkeletonBar className="h-3.5 w-3/5" />
            <SkeletonBar className="h-3.5 w-4/5" />
            <div className="flex gap-2 pt-1">
              <SkeletonBar className="h-5 w-16 rounded-full" />
              <SkeletonBar className="h-5 w-12 rounded-full" />
            </div>
          </div>
          <div className="flex justify-between border-t border-white/10 px-4 py-3">
            <SkeletonBar className="h-3.5 w-20" />
            <SkeletonBar className="h-3.5 w-14" />
          </div>
        </div>
      ))}
    </div>
  );
}
