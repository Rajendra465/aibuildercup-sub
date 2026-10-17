"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, CheckCircle2, CircleDashed, LoaderCircle, Volume2, X } from "lucide-react";
import type { GenerationJob } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { errorMessage, fetchJson, jsonInit, percent } from "./director-api";
import { StatusMessage, type Status } from "./status-message";

interface VariantCardProps {
  variant: GenerationJob;
  profileLabel: string;
  isCurrent: boolean;
  /** Campaign id → brand name, for labelling the job's adKey. */
  brandNames: ReadonlyMap<string, string>;
  /** Called with the updated job after approve / reject succeeds. */
  onJobUpdated: (job: GenerationJob) => void;
}

interface ApproveResponse {
  job: GenerationJob;
}

type StatusKind = "ready" | "failed" | "idle" | "working";

function statusKind(status: GenerationJob["status"]): StatusKind {
  if (status === "READY") return "ready";
  if (status === "FAILED" || status === "CANCELLED") return "failed";
  if (status === "EXPIRED") return "idle";
  return "working";
}

const STATUS_CHIP: Record<StatusKind, { chip: string; dot: string }> = {
  ready: { chip: "border-mint/40 bg-mint/10 text-mint", dot: "bg-mint" },
  failed: { chip: "border-red-400/40 bg-red-500/10 text-red-300", dot: "bg-red-400" },
  idle: { chip: "border-white/15 bg-white/[0.05] text-muted-foreground", dot: "bg-zinc-500" },
  working: { chip: "border-amber/40 bg-amber/10 text-amber", dot: "bg-amber" },
};

export function adKeyLabel(adKey: string, brandNames: ReadonlyMap<string, string>): string {
  if (adKey === "neutral") return "Neutral artwork";
  if (adKey === "none") return "No ad";
  const campaignId = adKey.startsWith("psa:") ? adKey.slice(4) : adKey;
  const name = brandNames.get(campaignId) ?? campaignId;
  return adKey.startsWith("psa:") ? `PSA · ${name}` : name;
}

function StatusChip({ status }: { status: GenerationJob["status"] }) {
  const kind = statusKind(status);
  const tone = STATUS_CHIP[kind];
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide", tone.chip)}>
      <span className="relative flex size-1.5" aria-hidden="true">
        {kind === "working" && <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-75", tone.dot)} />}
        <span className={cn("relative inline-flex size-1.5 rounded-full", tone.dot)} />
      </span>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function VariantCard({ variant, profileLabel, isCurrent, brandNames, onJobUpdated }: VariantCardProps) {
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const [status, setStatus] = useState<Status | null>(null);

  const setApproval = async (approved: boolean) => {
    setPending(approved ? "approve" : "reject");
    setStatus(null);
    try {
      const data = await fetchJson<ApproveResponse>("/api/jobs/approve", jsonInit("POST", { jobId: variant.id, approved }));
      onJobUpdated(data.job);
    } catch (error) {
      setStatus({ tone: "error", text: errorMessage(error, "Could not update approval") });
    } finally {
      setPending(null);
    }
  };

  const isAdCut = Boolean(variant.adKey);
  const canReview = variant.status === "READY";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "space-y-3 rounded-2xl border bg-white/[0.03] p-3",
        isCurrent ? "border-amber/30 shadow-[0_0_0_1px_rgb(242_165_65/0.12),0_12px_40px_-20px_rgb(242_165_65/0.6)]" : "border-white/10",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium text-white">{profileLabel}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            <span className={isCurrent ? "text-amber" : undefined}>{isCurrent ? "Current" : "Previous"}</span> ·{" "}
            {new Date(variant.createdAt || variant.startedAt || 0).toLocaleString()}
          </div>
        </div>
        <StatusChip status={variant.status} />
      </div>

      {variant.adKey && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-amber/50 bg-amber/10 px-2.5 py-0.5 text-xs font-medium text-amber">
            {adKeyLabel(variant.adKey, brandNames)}
          </span>
          {variant.exposure && <ExposureMeter exposure={variant.exposure} />}
        </div>
      )}
      {variant.exposure?.notes && <p className="text-xs leading-relaxed text-slate-400">{variant.exposure.notes}</p>}

      {variant.videoAssetUrl && (
        <video className="aspect-video w-full rounded-xl bg-black ring-1 ring-white/10" controls preload="metadata" src={variant.videoAssetUrl} />
      )}

      {variant.audioAssetUrl && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Volume2 className="size-3" aria-hidden /> Diegetic audio ad
          </div>
          <audio className="h-8 w-full" controls preload="none" src={variant.audioAssetUrl} />
        </div>
      )}

      {variant.failureReason && (
        <div className="rounded-lg border border-red-400/25 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-200">{variant.failureReason}</div>
      )}

      {isAdCut && canReview && (
        <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.08] pt-3">
          <span className={cn("flex flex-1 items-center gap-1.5 text-xs", variant.approved ? "text-mint" : "text-slate-400")}>
            {variant.approved ? <CheckCircle2 className="size-3.5" aria-hidden /> : <CircleDashed className="size-3.5" aria-hidden />}
            {variant.approved ? "Approved to play" : "Not approved"}
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending !== null || variant.approved}
            onClick={() => setApproval(true)}
            className="border border-mint/40 bg-mint/10 text-mint hover:bg-mint/20 hover:text-mint focus-visible:ring-mint/40"
          >
            {pending === "approve" ? <LoaderCircle className="size-3 animate-spin" /> : <Check className="size-3" />}
            Approve
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending !== null || !variant.approved}
            onClick={() => setApproval(false)}
            className="border border-red-400/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200 focus-visible:ring-red-400/40"
          >
            {pending === "reject" ? <LoaderCircle className="size-3 animate-spin" /> : <X className="size-3" />}
            Reject
          </Button>
        </div>
      )}
      <StatusMessage status={status} onDismiss={() => setStatus(null)} />
    </motion.div>
  );
}

interface ExposureMeterProps {
  exposure: NonNullable<GenerationJob["exposure"]>;
}

const RING_RADIUS = 15;

function ExposureMeter({ exposure }: ExposureMeterProps) {
  const reduceMotion = useReducedMotion();
  const withinCap = exposure.withinProminenceCap;
  const score = Math.max(0, Math.min(100, exposure.score));
  return (
    <div
      className="flex items-center gap-2"
      title={`Legibility ${percent(exposure.legibility)} · visible ${exposure.visibleSeconds}s of ${exposure.slotSeconds}s · ${exposure.source}`}
    >
      <div
        className="relative size-10 shrink-0"
        role="meter"
        aria-label="Exposure score"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
      >
        <svg viewBox="0 0 36 36" className="size-full -rotate-90" aria-hidden="true">
          <circle cx="18" cy="18" r={RING_RADIUS} fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth="3" />
          <motion.circle
            cx="18"
            cy="18"
            r={RING_RADIUS}
            fill="none"
            stroke={withinCap ? "#34D399" : "#F87171"}
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: score / 100 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 1, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center font-mono text-[11px] font-semibold text-white tabular-nums">{score}</span>
      </div>
      <div className="text-xs leading-tight">
        <div className="font-medium text-white">Exposure {score}/100</div>
        <div className={withinCap ? "text-mint" : "text-red-300"}>
          {percent(exposure.frameShare)} of frame · {withinCap ? "within cap" : "over cap"}
        </div>
      </div>
    </div>
  );
}
