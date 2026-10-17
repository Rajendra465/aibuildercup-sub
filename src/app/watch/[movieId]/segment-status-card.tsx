import { GenerationJob, PlaybackSegment } from "@/lib/types";
import { AdSlotInfo, decisionLabel } from "./ad-client";
import { StatusChip } from "./status-chip";

interface SegmentStatusCardProps {
  segment: PlaybackSegment;
  job?: GenerationJob;
  adSlot?: AdSlotInfo;
}

export function SegmentStatusCard({ segment, job, adSlot }: SegmentStatusCardProps) {
  const statusLabel = job?.status === "READY" ? segment.status : job?.status || segment.status;
  const exposureScore = adSlot?.cut?.exposure?.score;
  const isGenerated = segment.source === "GENERATED_CLIP";

  return (
    <div
      className={`glass flex flex-col gap-2.5 rounded-2xl p-4 transition-colors duration-300 hover:border-white/25 ${
        adSlot ? "border-amber/30 shadow-[0_0_0_1px_rgb(242_165_65/0.12),0_20px_50px_-24px_rgb(242_165_65/0.45)]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 truncate text-sm font-medium text-white">{segment.label || segment.id}</div>
        <StatusChip status={statusLabel} />
      </div>
      <dl className="flex flex-col gap-1.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">Source</dt>
          <dd className={`font-mono ${isGenerated ? "text-mint" : "text-white/70"}`}>
            {isGenerated ? "Generated Asset" : "Canonical Fallback"}
          </dd>
        </div>
        {adSlot && (
          <>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted-foreground">Ad</dt>
              <dd className="truncate text-amber">{decisionLabel(adSlot.decision)}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted-foreground">Exposure</dt>
              <dd className="font-mono text-white/80">
                {exposureScore === undefined ? "pending" : `${Math.round(exposureScore)}/100`}
              </dd>
            </div>
            {exposureScore !== undefined && (
              <div className="h-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber to-violet transition-[width] duration-700"
                  style={{ width: `${Math.min(100, Math.max(0, exposureScore))}%` }}
                />
              </div>
            )}
          </>
        )}
      </dl>
    </div>
  );
}
