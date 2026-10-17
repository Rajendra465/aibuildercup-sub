"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Film, Inbox, KeyRound, MapPinned, Sparkles, UserRound } from "lucide-react";
import type { ExposureReport, GenerationJobStatus } from "@/lib/types";
import { Stagger, StaggerItem } from "@/components/fx/motion";
import { cn } from "@/lib/utils";

/** The slice of a GenerationJob the jobs page renders. */
export interface JobView {
  id: string;
  status: GenerationJobStatus;
  slotId: string;
  profileId?: string;
  placement?: string;
  exposure?: ExposureReport;
  cacheKey: string;
  videoPrompt?: string;
  failureReason?: string;
}

type StatusTone = "ready" | "failed" | "idle" | "working";

function toneOf(status: GenerationJobStatus): StatusTone {
  if (status === "READY") return "ready";
  if (status === "FAILED") return "failed";
  if (status === "EXPIRED" || status === "CANCELLED") return "idle";
  return "working";
}

const TONE_STYLES: Readonly<Record<StatusTone, { chip: string; dot: string; rail: string }>> = {
  ready: { chip: "border-mint/40 bg-mint/15 text-mint", dot: "bg-mint", rail: "from-mint/70" },
  failed: { chip: "border-red-500/40 bg-red-500/15 text-red-300", dot: "bg-red-400", rail: "from-red-500/70" },
  idle: { chip: "border-white/15 bg-white/5 text-zinc-400", dot: "bg-zinc-500", rail: "from-zinc-500/50" },
  working: { chip: "border-amber/40 bg-amber/15 text-amber", dot: "bg-amber", rail: "from-amber/70" },
};

function StatusChip({ status }: { status: GenerationJobStatus }) {
  const tone = toneOf(status);
  const style = TONE_STYLES[tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide", style.chip)}>
      <span className="relative flex size-1.5" aria-hidden="true">
        {tone === "working" && <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-75", style.dot)} />}
        <span className={cn("relative inline-flex size-1.5 rounded-full", style.dot)} />
      </span>
      {status}
    </span>
  );
}

function MetaRow({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <span className="flex w-28 shrink-0 items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}:
      </span>
      <span className="min-w-0 font-mono text-slate-200">{children}</span>
    </div>
  );
}

function ExposureMeter({ exposure }: { exposure: ExposureReport }) {
  const score = Math.round(exposure.score);
  const withinCap = exposure.withinProminenceCap;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Exposure</span>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[11px] font-medium",
            withinCap ? "border-mint/40 text-mint" : "border-red-500/50 text-red-300",
          )}
        >
          {withinCap ? "Within prominence cap" : "Over prominence cap"}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-display text-lg font-semibold text-amber tabular-nums">{score}/100</span>
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.07]"
          role="meter"
          aria-label="Exposure score"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={score}
        >
          <div
            className={cn("h-full rounded-full bg-gradient-to-r", withinCap ? "from-amber to-mint" : "from-amber to-red-500")}
            style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
        <span>{Math.round(exposure.frameShare * 100)}% of frame</span>
        <span>
          {exposure.visibleSeconds.toFixed(1)}s / {exposure.slotSeconds.toFixed(1)}s visible
        </span>
        <span>legibility {Math.round(exposure.legibility * 100)}%</span>
        <span className="text-slate-500">({exposure.source})</span>
      </div>
    </div>
  );
}

function PromptBlock({ prompt }: { prompt: string }) {
  return (
    <figure className="overflow-hidden rounded-xl border border-white/10 bg-ink/70 shadow-inner">
      <figcaption className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-2">
        <span className="flex gap-1" aria-hidden="true">
          <span className="size-2 rounded-full bg-red-400/70" />
          <span className="size-2 rounded-full bg-amber/70" />
          <span className="size-2 rounded-full bg-mint/70" />
        </span>
        <Sparkles className="ml-1 size-3.5 text-amber" aria-hidden="true" />
        <span className="text-xs font-semibold tracking-wider text-amber uppercase">Gemini Omni scene-edit prompt</span>
      </figcaption>
      <pre className="max-h-72 overflow-auto px-4 py-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-amber-50/90">
        <code>&quot;{prompt}&quot;</code>
      </pre>
    </figure>
  );
}

function JobCard({ job }: { job: JobView }) {
  const style = TONE_STYLES[toneOf(job.status)];
  return (
    <article className="glass group relative overflow-hidden rounded-2xl transition-colors hover:border-white/20">
      <div aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1 bg-gradient-to-b to-transparent", style.rail)} />
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <h2 className="flex min-w-0 items-center gap-2 text-base font-semibold text-white">
          <Film className="size-4 shrink-0 text-amber" aria-hidden="true" />
          <span className="truncate">Job: {job.id}</span>
        </h2>
        <StatusChip status={job.status} />
      </header>
      <div className="flex flex-col gap-3 px-5 py-4 text-sm">
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          <MetaRow icon={Film} label="Slot ID">{job.slotId}</MetaRow>
          <MetaRow icon={UserRound} label="Profile">{job.profileId}</MetaRow>
          {job.placement && (
            <MetaRow icon={MapPinned} label="Placement">{job.placement}</MetaRow>
          )}
          <MetaRow icon={KeyRound} label="Cache Key">
            <span className="text-xs break-all">{job.cacheKey}</span>
          </MetaRow>
        </div>
        {job.status === "FAILED" && job.failureReason && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{job.failureReason}</p>
        )}
        {job.exposure && <ExposureMeter exposure={job.exposure} />}
        {job.videoPrompt && <PromptBlock prompt={job.videoPrompt} />}
      </div>
    </article>
  );
}

export function JobList({ jobs }: { jobs: JobView[] }) {
  if (jobs.length === 0) {
    return (
      <div className="glass flex flex-col items-center gap-3 rounded-2xl p-12 text-center text-muted-foreground">
        <span className="flex size-12 animate-float items-center justify-center rounded-2xl glass-strong">
          <Inbox className="size-5 text-amber" aria-hidden="true" />
        </span>
        <p>No jobs in the queue.</p>
      </div>
    );
  }
  return (
    <MotionConfig reducedMotion="user">
      <Stagger className="flex flex-col gap-4">
        {jobs.map((job) => (
          <StaggerItem key={job.id}>
            <JobCard job={job} />
          </StaggerItem>
        ))}
      </Stagger>
    </MotionConfig>
  );
}
