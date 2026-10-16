import { GenerationJob, PlaybackSegment } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { AdSlotInfo, decisionLabel } from "./ad-client";

interface SegmentStatusCardProps {
  segment: PlaybackSegment;
  job?: GenerationJob;
  adSlot?: AdSlotInfo;
}

function statusClassName(status: string): string {
  if (status === "READY") return "text-green-400 border-green-900";
  if (status === "FALLBACK") return "text-amber-400 border-amber-900";
  if (status === "FAILED") return "text-red-400 border-red-900";
  return "text-blue-400 border-blue-900 animate-pulse";
}

export function SegmentStatusCard({ segment, job, adSlot }: SegmentStatusCardProps) {
  const statusLabel = job?.status === "READY" ? segment.status : job?.status || segment.status;
  const exposureScore = adSlot?.cut?.exposure?.score;

  return (
    <div
      className={`p-3 bg-zinc-900 border rounded-lg flex flex-col gap-2 ${adSlot ? "border-[#F2A541]/30" : "border-zinc-800"}`}
    >
      <div className="font-medium text-slate-200 text-sm">{segment.label || segment.id}</div>
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-500">Status</span>
        <Badge variant="outline" className={statusClassName(statusLabel)}>
          {statusLabel}
        </Badge>
      </div>
      <div className="flex justify-between items-center text-xs mt-1">
        <span className="text-slate-500">Source</span>
        <span className="text-slate-400 font-mono">
          {segment.source === "GENERATED_CLIP" ? "Generated Asset" : "Canonical Fallback"}
        </span>
      </div>
      {adSlot && (
        <>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Ad</span>
            <span className="text-[#F2A541] truncate">{decisionLabel(adSlot.decision)}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Exposure</span>
            <span className="text-slate-300 font-mono">
              {exposureScore === undefined ? "pending" : `${Math.round(exposureScore)}/100`}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
