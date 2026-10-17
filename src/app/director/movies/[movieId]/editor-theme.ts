import type { SlotType } from "@/lib/types";

export const FPS = 24;

export interface SlotTone {
  label: string;
  /** Timeline block fill. */
  block: string;
  /** Chip when not selected. */
  chip: string;
  /** Chip when selected. */
  chipActive: string;
  /** Small swatch / dot. */
  swatch: string;
}

const VIOLET: Omit<SlotTone, "label"> = {
  block: "border-violet/60 bg-linear-to-r from-violet/75 to-violet/40 text-white",
  chip: "border-violet/35 bg-violet/10 text-violet-100 hover:bg-violet/20",
  chipActive: "border-violet bg-violet text-white shadow-[0_6px_24px_-6px_rgb(139_92_246/0.8)]",
  swatch: "bg-violet",
};

const AZURE: Omit<SlotTone, "label"> = {
  block: "border-azure/60 bg-linear-to-r from-azure/75 to-azure/40 text-white",
  chip: "border-azure/35 bg-azure/10 text-blue-100 hover:bg-azure/20",
  chipActive: "border-azure bg-azure text-white shadow-[0_6px_24px_-6px_rgb(59_107_255/0.8)]",
  swatch: "bg-azure",
};

export const SLOT_TONES: Record<SlotType, SlotTone> = {
  ADSPOT_BILLBOARD: {
    label: "Ad spot",
    block: "border-amber/80 bg-linear-to-r from-amber to-amber-deep/80 text-zinc-950",
    chip: "border-amber/45 bg-amber/10 text-amber hover:bg-amber/20",
    chipActive: "border-amber bg-amber text-zinc-950 shadow-[0_6px_24px_-6px_rgb(242_165_65/0.85)]",
    swatch: "bg-amber",
  },
  CITY_ESTABLISHING: { label: "City establishing", ...AZURE },
  LOCALIZED_PROP: { label: "Localized prop", ...VIOLET },
  DIEGETIC_SCREEN: { label: "Diegetic screen", ...VIOLET },
};

const pad = (value: number): string => String(value).padStart(2, "0");

/** HH:MM:SS:FF timecode at the editor frame rate. */
export function formatTimecode(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const totalFrames = Math.floor(safe * FPS);
  const frames = totalFrames % FPS;
  const totalSeconds = Math.floor(totalFrames / FPS);
  return `${pad(Math.floor(totalSeconds / 3600))}:${pad(Math.floor(totalSeconds / 60) % 60)}:${pad(totalSeconds % 60)}:${pad(frames)}`;
}

/** m:ss for ruler labels. */
export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${pad(whole % 60)}`;
}

const NICE_STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1200];
const TARGET_TICKS = 8;

/** Evenly spaced ruler ticks with a human-friendly step. */
export function rulerTicks(duration: number): number[] {
  if (!Number.isFinite(duration) || duration <= 0) return [0];
  const rough = duration / TARGET_TICKS;
  const step = NICE_STEPS.find((candidate) => candidate >= rough) ?? NICE_STEPS[NICE_STEPS.length - 1];
  const count = Math.floor(duration / step);
  return Array.from({ length: count + 1 }, (_, index) => index * step);
}
