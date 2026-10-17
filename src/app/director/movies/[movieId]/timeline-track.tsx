"use client";

import { useRef, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { motion } from "framer-motion";
import { Film } from "lucide-react";
import type { AdaptiveSlot, ScoutCandidate } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SLOT_TONES, formatClock, formatTimecode, rulerTicks } from "./editor-theme";

interface TimelineTrackProps {
  duration: number;
  currentTime: number;
  slots: AdaptiveSlot[];
  candidates: ScoutCandidate[];
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string) => void;
  /** Move the playhead without pausing. */
  onScrub: (seconds: number) => void;
  /** Jump to a scout candidate (pauses and scrolls the stage into view). */
  onPreviewCandidate: (seconds: number) => void;
}

const KEY_STEP_SECONDS = 1;
const KEY_STEP_LARGE_SECONDS = 5;

const LEGEND = [
  { label: "Ad slot", swatch: "bg-amber" },
  { label: "Prop / screen", swatch: "bg-violet" },
  { label: "City", swatch: "bg-azure" },
] as const;

export function TimelineTrack({
  duration,
  currentTime,
  slots,
  candidates,
  selectedSlotId,
  onSelectSlot,
  onScrub,
  onPreviewCandidate,
}: TimelineTrackProps) {
  const isScrubbing = useRef(false);
  const safeDuration = duration > 0 ? duration : 1;
  const pct = (seconds: number) => Math.max(0, Math.min(100, (seconds / safeDuration) * 100));
  const clampTime = (seconds: number) => Math.max(0, Math.min(safeDuration, seconds));

  const secondsAt = (clientX: number, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    return clampTime(((clientX - rect.left) / rect.width) * safeDuration);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    isScrubbing.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    onScrub(secondsAt(event.clientX, event.currentTarget));
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (isScrubbing.current) onScrub(secondsAt(event.clientX, event.currentTarget));
  };

  const stopScrub = () => {
    isScrubbing.current = false;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? KEY_STEP_LARGE_SECONDS : KEY_STEP_SECONDS;
    const next =
      event.key === "ArrowRight" || event.key === "ArrowUp"
        ? currentTime + step
        : event.key === "ArrowLeft" || event.key === "ArrowDown"
          ? currentTime - step
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? safeDuration
              : null;
    if (next === null) return;
    event.preventDefault();
    onScrub(clampTime(next));
  };

  const handleLaneClick = (event: MouseEvent<HTMLDivElement>) => {
    onScrub(secondsAt(event.clientX, event.currentTarget));
  };

  const ticks = rulerTicks(duration);

  return (
    <section aria-labelledby="timeline-heading" className="glass rounded-3xl p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 id="timeline-heading" className="flex items-center gap-2 text-sm font-semibold text-white">
          <Film className="size-4 text-amber" aria-hidden />
          Timeline
        </h2>
        <span className="font-mono text-xs text-amber tabular-nums">{formatTimecode(currentTime)}</span>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">/ {formatTimecode(duration)}</span>
        <ul className="ml-auto flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground" aria-label="Legend">
          {LEGEND.map((entry) => (
            <li key={entry.label} className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-sm", entry.swatch)} aria-hidden="true" />
              {entry.label}
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm border border-dashed border-amber" aria-hidden="true" />
            Scout
          </li>
        </ul>
      </div>

      <div className="flex">
        <div className="w-16 shrink-0 pr-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase sm:w-20" aria-hidden="true">
          <div className="h-7" />
          <div className="flex h-11 items-center">Segments</div>
          <div className="flex h-9 items-center">Scout</div>
        </div>

        <div className="relative min-w-0 flex-1">
          {/* Ruler doubles as the keyboard-accessible scrubber */}
          <div
            role="slider"
            tabIndex={0}
            aria-label="Playhead position"
            aria-valuemin={0}
            aria-valuemax={Math.round(safeDuration * 1000) / 1000}
            aria-valuenow={Math.round(currentTime * 1000) / 1000}
            aria-valuetext={`${currentTime.toFixed(1)} seconds`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopScrub}
            onPointerCancel={stopScrub}
            onKeyDown={handleKeyDown}
            className="relative h-7 cursor-ew-resize touch-none rounded-md border-b border-white/10 outline-none select-none focus-visible:ring-2 focus-visible:ring-amber/60"
          >
            {ticks.map((tick) => (
              <div key={tick} className="absolute bottom-0 flex flex-col items-start" style={{ left: `${pct(tick)}%` }}>
                <span className="-translate-x-1/2 pb-1 font-mono text-[10px] text-muted-foreground/80 tabular-nums">{formatClock(tick)}</span>
                <span className="h-1.5 w-px bg-white/25" />
              </div>
            ))}
          </div>

          {/* Segment lane */}
          <div className="relative mt-1 h-10 cursor-pointer rounded-lg bg-white/[0.03] ring-1 ring-white/[0.06] ring-inset" onClick={handleLaneClick}>
            {slots.map((slot, index) => {
              const tone = SLOT_TONES[slot.type];
              const isSelected = selectedSlotId === slot.id;
              return (
                <motion.button
                  key={slot.id}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`${tone.label}: ${slot.label}, ${slot.startSeconds.toFixed(1)} to ${slot.endSeconds.toFixed(1)} seconds`}
                  title={slot.label}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectSlot(slot.id);
                  }}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 + index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    "absolute inset-y-1 min-w-1.5 origin-left overflow-hidden rounded-md border px-1.5 text-left text-[10px] leading-8 font-semibold whitespace-nowrap outline-none transition-[box-shadow,filter] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-white",
                    tone.block,
                    isSelected ? "z-10 ring-2 ring-white/80 shadow-[0_0_18px_rgb(255_255_255/0.25)]" : "opacity-85",
                  )}
                  style={{ left: `${pct(slot.startSeconds)}%`, width: `${pct(slot.endSeconds) - pct(slot.startSeconds)}%` }}
                >
                  <span className="block truncate">{slot.label}</span>
                </motion.button>
              );
            })}
          </div>

          {/* Scout lane */}
          <div className="relative mt-1 h-8 cursor-pointer rounded-lg bg-white/[0.02] ring-1 ring-white/[0.05] ring-inset" onClick={handleLaneClick}>
            {candidates.length === 0 && (
              <span className="pointer-events-none absolute inset-0 flex items-center px-3 text-[11px] text-muted-foreground/60">
                Run Slot Scout to see candidate windows
              </span>
            )}
            {candidates.map((candidate, index) => (
              <motion.button
                key={candidate.id}
                type="button"
                aria-label={`Scout candidate: ${candidate.surfaceType}, ${candidate.startSeconds.toFixed(1)} to ${candidate.endSeconds.toFixed(1)} seconds. Preview`}
                title={`Scout: ${candidate.surfaceType}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onPreviewCandidate(candidate.startSeconds);
                }}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.04 }}
                className="absolute inset-y-1 min-w-1.5 rounded-md border-2 border-dashed border-amber/80 bg-amber/10 outline-none transition-colors hover:bg-amber/25 focus-visible:ring-2 focus-visible:ring-white"
                style={{ left: `${pct(candidate.startSeconds)}%`, width: `${pct(candidate.endSeconds) - pct(candidate.startSeconds)}%` }}
              />
            ))}
          </div>

          {/* Playhead */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 z-20 w-px -translate-x-1/2 bg-amber shadow-[0_0_10px_rgb(242_165_65/0.9)] transition-[left] duration-200 ease-linear"
            style={{ left: `${pct(currentTime)}%` }}
          >
            <span className="absolute -top-1 left-1/2 size-2.5 -translate-x-1/2 rotate-45 rounded-[2px] bg-amber shadow-[0_0_10px_rgb(242_165_65/0.9)]" />
          </div>
        </div>
      </div>

      {/* Slot chips */}
      <div className="mt-4 flex gap-2 overflow-x-auto border-t border-white/[0.08] pt-4 pb-1" role="group" aria-label="Segments">
        {slots.map((slot) => {
          const isAd = slot.type === "ADSPOT_BILLBOARD";
          const isSelected = selectedSlotId === slot.id;
          const tone = SLOT_TONES[slot.type];
          return (
            <button
              key={slot.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelectSlot(slot.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap outline-none transition-all focus-visible:ring-2 focus-visible:ring-amber/70",
                isSelected ? tone.chipActive : tone.chip,
              )}
            >
              <span className={cn("size-1.5 rounded-full", isSelected ? "bg-current" : tone.swatch)} aria-hidden="true" />
              {isAd && "Ad · "}
              {slot.label} ({slot.startSeconds.toFixed(3)}s - {slot.endSeconds.toFixed(3)}s)
            </button>
          );
        })}
        {slots.length === 0 && <p className="text-xs text-muted-foreground">No segments yet. Use Add Segment or accept a Slot Scout candidate.</p>}
      </div>
    </section>
  );
}
