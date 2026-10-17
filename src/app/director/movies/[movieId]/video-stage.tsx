"use client";

import type { MouseEvent, RefObject } from "react";
import { Pause, Play, StepBack, StepForward } from "lucide-react";
import type { AdaptiveSlot, ScoutCandidate } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AD_ACCENT } from "./director-api";
import { formatTimecode } from "./editor-theme";

const PLAYBACK_RATES = [
  { value: 0.25, label: "0.25x" },
  { value: 0.5, label: "0.5x" },
  { value: 1, label: "1.0x" },
  { value: 1.5, label: "1.5x" },
  { value: 2, label: "2.0x" },
] as const;

interface VideoStageProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  src: string;
  isPlaying: boolean;
  currentTime: number;
  playbackRate: number;
  slots: AdaptiveSlot[];
  candidates: ScoutCandidate[];
  selectedSlotId: string | null;
  timelinePercent: (seconds: number) => number;
  onTogglePlay: () => void;
  onStepFrame: (forward: boolean) => void;
  onRateChange: (rate: number) => void;
  onTimeUpdate: () => void;
  onEnded: () => void;
  onScrubClick: (event: MouseEvent<HTMLDivElement>) => void;
}

const controlButton =
  "grid size-8 place-items-center rounded-lg text-white outline-none transition-colors hover:bg-white/10 hover:text-amber focus-visible:ring-2 focus-visible:ring-amber/70";

/** Program monitor: the canonical video, its transport controls and a mini scrubber. */
export function VideoStage({
  videoRef,
  src,
  isPlaying,
  currentTime,
  playbackRate,
  slots,
  candidates,
  selectedSlotId,
  timelinePercent,
  onTogglePlay,
  onStepFrame,
  onRateChange,
  onTimeUpdate,
  onEnded,
  onScrubClick,
}: VideoStageProps) {
  return (
    <div className="relative isolate">
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -inset-6 -z-10 rounded-[3rem] blur-2xl transition-opacity duration-700",
          "bg-[radial-gradient(55%_60%_at_25%_40%,rgb(242_165_65/0.28),transparent_70%),radial-gradient(50%_60%_at_80%_65%,rgb(139_92_246/0.3),transparent_70%)]",
          isPlaying ? "opacity-100" : "opacity-70",
        )}
      />
      <div className="glass-strong rounded-3xl p-2 sm:p-3">
        <div className="flex items-center gap-3 px-2 pb-2 text-[11px] text-muted-foreground sm:pb-3">
          <span className="flex items-center gap-1.5 font-semibold tracking-[0.2em] uppercase">
            <span className="relative flex size-2" aria-hidden="true">
              {isPlaying && <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint opacity-70" />}
              <span className={cn("relative inline-flex size-2 rounded-full", isPlaying ? "bg-mint" : "bg-amber")} />
            </span>
            Program
          </span>
          <span className="hidden sm:inline">{isPlaying ? "Playing" : "Paused"}</span>
          <span className="ml-auto font-mono text-xs text-white tabular-nums" aria-label="Timecode">
            {formatTimecode(currentTime)}
          </span>
          <span className="rounded-md border border-white/10 px-1.5 py-0.5 font-mono">{playbackRate}x</span>
        </div>

        <div className="group relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-black ring-1 ring-white/10">
          <video
            ref={videoRef}
            src={src}
            className="h-full w-full object-cover"
            playsInline
            onTimeUpdate={onTimeUpdate}
            onEnded={onEnded}
            onClick={onTogglePlay}
          />

          {/* Play/Pause Overlay */}
          <div
            className={cn(
              "pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300",
              isPlaying ? "opacity-0" : "bg-black/40 opacity-100",
            )}
          >
            <div className="grid size-16 place-items-center rounded-full border border-white/25 bg-white/10 shadow-[0_0_40px_rgb(242_165_65/0.35)] backdrop-blur-md sm:size-20">
              <Play className="ml-1 size-7 fill-amber text-amber sm:size-8" aria-hidden />
            </div>
          </div>

          {/* Transport + scrubber */}
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-linear-to-t from-black/85 via-black/50 to-transparent p-3 opacity-0 transition-opacity duration-300 group-focus-within:opacity-100 group-hover:opacity-100 sm:p-4">
            <div className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-black/50 p-0.5 backdrop-blur-md">
              <button type="button" onClick={() => onStepFrame(false)} className={controlButton} title="Previous Frame" aria-label="Previous frame">
                <StepBack className="size-4" aria-hidden />
              </button>
              <button type="button" onClick={onTogglePlay} className={controlButton} aria-label={isPlaying ? "Pause" : "Play"}>
                {isPlaying ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
              </button>
              <button type="button" onClick={() => onStepFrame(true)} className={controlButton} title="Next Frame" aria-label="Next frame">
                <StepForward className="size-4" aria-hidden />
              </button>
            </div>

            <select
              value={playbackRate}
              onChange={(event) => onRateChange(Number(event.target.value))}
              aria-label="Playback speed"
              className="h-9 cursor-pointer rounded-xl border border-white/10 bg-black/50 px-2 text-xs text-white outline-none backdrop-blur-md hover:border-amber/50 focus-visible:ring-2 focus-visible:ring-amber/70 [&>option]:bg-night"
            >
              {PLAYBACK_RATES.map((rate) => (
                <option key={rate.value} value={rate.value}>
                  {rate.label}
                </option>
              ))}
            </select>

            <div className="w-16 text-center font-mono text-xs text-slate-200 tabular-nums">{currentTime.toFixed(3)}s</div>

            <div className="relative ml-1 h-2.5 flex-1 cursor-pointer overflow-hidden rounded-full bg-white/15" onClick={onScrubClick}>
              <div
                className="pointer-events-none absolute inset-y-0 left-0 bg-linear-to-r from-amber-deep to-amber"
                style={{ width: `${timelinePercent(currentTime)}%` }}
              />
              {slots.map((slot) => {
                const isAd = slot.type === "ADSPOT_BILLBOARD";
                const isSelected = selectedSlotId === slot.id;
                return (
                  <div
                    key={slot.id}
                    className={cn(
                      "pointer-events-none absolute h-full transition-colors",
                      !isAd && (isSelected ? "bg-violet/85" : "bg-violet/45"),
                    )}
                    style={{
                      left: `${timelinePercent(slot.startSeconds)}%`,
                      width: `${timelinePercent(slot.endSeconds - slot.startSeconds)}%`,
                      ...(isAd ? { backgroundColor: AD_ACCENT, opacity: isSelected ? 0.85 : 0.5 } : {}),
                    }}
                  />
                );
              })}
              {candidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="pointer-events-none absolute inset-y-0 rounded-sm border border-dashed"
                  style={{
                    left: `${timelinePercent(candidate.startSeconds)}%`,
                    width: `${timelinePercent(candidate.endSeconds - candidate.startSeconds)}%`,
                    borderColor: AD_ACCENT,
                  }}
                  title={`Scout: ${candidate.surfaceType}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
