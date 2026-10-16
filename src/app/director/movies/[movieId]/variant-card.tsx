"use client";

import { useState } from "react";
import { Check, LoaderCircle, Volume2, X } from "lucide-react";
import type { GenerationJob } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AD_ACCENT, errorMessage, fetchJson, jsonInit, percent } from "./director-api";
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

const STATUS_BADGE = (status: GenerationJob["status"]) =>
  status === "READY"
    ? "border-emerald-700 text-emerald-300"
    : status === "FAILED" || status === "CANCELLED"
      ? "border-red-800 text-red-300"
      : "border-zinc-600 text-slate-300";

export function adKeyLabel(adKey: string, brandNames: ReadonlyMap<string, string>): string {
  if (adKey === "neutral") return "Neutral artwork";
  if (adKey === "none") return "No ad";
  const campaignId = adKey.startsWith("psa:") ? adKey.slice(4) : adKey;
  const name = brandNames.get(campaignId) ?? campaignId;
  return adKey.startsWith("psa:") ? `PSA · ${name}` : name;
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
    <div className="border border-zinc-800 bg-zinc-950 p-3 rounded-md space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-slate-200 truncate">{profileLabel}</span>
        <Badge variant="outline" className={STATUS_BADGE(variant.status)}>{variant.status}</Badge>
      </div>
      <div className="text-xs text-zinc-500">
        {isCurrent ? "Current" : "Previous"} · {new Date(variant.createdAt || variant.startedAt || 0).toLocaleString()}
      </div>

      {variant.adKey && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" style={{ borderColor: AD_ACCENT, color: AD_ACCENT }}>
            {adKeyLabel(variant.adKey, brandNames)}
          </Badge>
          {variant.exposure && <ExposureBadge exposure={variant.exposure} />}
        </div>
      )}
      {variant.exposure?.notes && <p className="text-xs text-slate-400">{variant.exposure.notes}</p>}

      {variant.videoAssetUrl && <video className="w-full aspect-video bg-black" controls preload="metadata" src={variant.videoAssetUrl} />}

      {variant.audioAssetUrl && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Volume2 className="size-3" aria-hidden /> Diegetic audio ad
          </div>
          <audio className="w-full h-8" controls preload="none" src={variant.audioAssetUrl} />
        </div>
      )}

      {variant.failureReason && <div className="text-xs text-red-300">{variant.failureReason}</div>}

      {isAdCut && canReview && (
        <div className="flex items-center gap-2 pt-1">
          <span className={`text-xs flex-1 ${variant.approved ? "text-emerald-300" : "text-slate-400"}`}>
            {variant.approved ? "Approved to play" : "Not approved"}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={pending !== null || variant.approved}
            onClick={() => setApproval(true)}
            className="border-emerald-800 text-emerald-300 hover:bg-emerald-950"
          >
            {pending === "approve" ? <LoaderCircle className="size-3 animate-spin" /> : <Check className="size-3" />}
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending !== null || !variant.approved}
            onClick={() => setApproval(false)}
            className="border-red-900 text-red-300 hover:bg-red-950"
          >
            {pending === "reject" ? <LoaderCircle className="size-3 animate-spin" /> : <X className="size-3" />}
            Reject
          </Button>
        </div>
      )}
      <StatusMessage status={status} onDismiss={() => setStatus(null)} />
    </div>
  );
}

interface ExposureBadgeProps {
  exposure: NonNullable<GenerationJob["exposure"]>;
}

function ExposureBadge({ exposure }: ExposureBadgeProps) {
  const tone = exposure.withinProminenceCap ? "border-emerald-800 text-emerald-300" : "border-red-800 text-red-300";
  return (
    <Badge
      variant="outline"
      className={tone}
      title={`Legibility ${percent(exposure.legibility)} · visible ${exposure.visibleSeconds}s of ${exposure.slotSeconds}s · ${exposure.source}`}
    >
      Exposure {exposure.score}/100 · {percent(exposure.frameShare)} of frame ·{" "}
      {exposure.withinProminenceCap ? "within cap" : "over cap"}
    </Badge>
  );
}
