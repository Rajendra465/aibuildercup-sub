"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, LoaderCircle, Play, Radar, Sparkles } from "lucide-react";
import type { AdaptiveSlot, ScoutCandidate } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/fx/motion";
import { cn } from "@/lib/utils";
import { errorMessage, fetchJson, formatSeconds, jsonInit, percent, reloadWithFlash } from "./director-api";
import { StatusMessage, type Status } from "./status-message";
import { Shimmer } from "./shimmer";

interface SlotScoutPanelProps {
  movieId: string;
  candidates: ScoutCandidate[];
  onCandidatesChange: (candidates: ScoutCandidate[]) => void;
  onSeek: (seconds: number) => void;
}

interface CandidatesResponse {
  candidates: ScoutCandidate[];
}

interface AcceptResponse {
  slot: AdaptiveSlot;
}

const SKELETON_CARDS = 3;
const EASE = [0.22, 1, 0.36, 1] as const;

export function SlotScoutPanel({ movieId, candidates, onCandidatesChange, onSeek }: SlotScoutPanelProps) {
  const [isScouting, setIsScouting] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchJson<CandidatesResponse>(`/api/scout?movieId=${encodeURIComponent(movieId)}`)
      .then((data) => {
        if (!cancelled) onCandidatesChange(data.candidates);
      })
      .catch((error: unknown) => {
        if (!cancelled) setStatus({ tone: "error", text: errorMessage(error, "Could not load previous scout results") });
      });
    return () => {
      cancelled = true;
    };
  }, [movieId, onCandidatesChange]);

  const handleScout = async () => {
    setIsScouting(true);
    setStatus({ tone: "info", text: "Gemini is watching the film for ad surfaces. This usually takes 30–90 seconds." });
    try {
      const data = await fetchJson<CandidatesResponse>("/api/scout", jsonInit("POST", { movieId }));
      onCandidatesChange(data.candidates);
      const heuristic = data.candidates.some((candidate) => candidate.source === "heuristic");
      setStatus(
        data.candidates.length === 0
          ? { tone: "info", text: "No usable ad surfaces found in this film." }
          : {
              tone: "success",
              text: heuristic
                ? `Found ${data.candidates.length} windows. Gemini is not configured, so these are guesses: review each one by eye.`
                : `Gemini found ${data.candidates.length} ad surfaces. Click one to preview it.`,
            },
      );
    } catch (error) {
      setStatus({ tone: "error", text: errorMessage(error, "Slot Scout failed") });
    } finally {
      setIsScouting(false);
    }
  };

  const handleAccept = async (candidate: ScoutCandidate) => {
    setAcceptingId(candidate.id);
    setStatus(null);
    try {
      const data = await fetchJson<AcceptResponse>("/api/scout", jsonInit("POST", { movieId, acceptCandidateId: candidate.id }));
      reloadWithFlash(
        `Added ad slot "${data.slot.label}". Click "Export Fallback Segments" to cut its clip before generating variants.`,
      );
    } catch (error) {
      setStatus({ tone: "error", text: errorMessage(error, "Could not accept this candidate") });
      setAcceptingId(null);
    }
  };

  return (
    <section aria-labelledby="slot-scout-heading" className="glass relative overflow-hidden rounded-3xl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-amber/15 blur-3xl"
      />
      <header className="relative flex flex-col gap-4 border-b border-white/[0.08] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber/10 ring-1 ring-amber/30">
            <Radar className={cn("size-5 text-amber", isScouting && "animate-[spin_2.4s_linear_infinite]")} aria-hidden />
          </span>
          <div>
            <h2 id="slot-scout-heading" className="flex flex-wrap items-center gap-2 text-lg font-semibold text-white">
              Slot Scout
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border border-violet/40 bg-violet/15 px-2 py-0.5 font-sans text-[10px] font-semibold tracking-wider text-violet-100 uppercase",
                  isScouting && "shimmer-bg animate-shimmer",
                )}
              >
                <Sparkles className="size-3" aria-hidden />
                Gemini
              </span>
            </h2>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
              Gemini finds billboards, screens and signs where a brand could sit without touching the story.
            </p>
          </div>
        </div>
        <Button onClick={handleScout} disabled={isScouting} className="h-10 shrink-0 px-4">
          {isScouting ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Radar className="size-4" aria-hidden />}
          {isScouting ? "Scouting…" : "Scout ad surfaces with Gemini"}
        </Button>
      </header>
      <div className="relative flex flex-col gap-3 p-5">
        <StatusMessage status={status} onDismiss={isScouting ? undefined : () => setStatus(null)} />
        {isScouting ? (
          <ul className="grid gap-3 md:grid-cols-2" aria-label="Scouting in progress">
            {Array.from({ length: SKELETON_CARDS }, (_, index) => (
              <li key={index} className="space-y-3 rounded-2xl border border-dashed border-amber/25 bg-white/[0.02] p-4">
                <div className="flex gap-2">
                  <Shimmer className="h-5 w-20 rounded-full" />
                  <Shimmer className="h-5 w-16 rounded-full" />
                </div>
                <Shimmer className="h-3 w-full" />
                <Shimmer className="h-3 w-3/4" />
                <Shimmer className="h-1.5 w-full rounded-full" />
              </li>
            ))}
          </ul>
        ) : candidates.length === 0 ? (
          <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-white/10 py-10 text-center">
            <Radar className="size-6 text-muted-foreground/60" aria-hidden />
            <p className="text-sm text-muted-foreground">No candidates yet. Run the scout to find ad surfaces.</p>
          </div>
        ) : (
          <motion.ul
            className="grid gap-3 md:grid-cols-2"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
          >
            {candidates.map((candidate, index) => (
              <CandidateCard
                key={candidate.id}
                rank={index + 1}
                candidate={candidate}
                isAccepting={acceptingId === candidate.id}
                isDisabled={acceptingId !== null}
                onSeek={onSeek}
                onAccept={handleAccept}
              />
            ))}
          </motion.ul>
        )}
      </div>
    </section>
  );
}

interface CandidateCardProps {
  rank: number;
  candidate: ScoutCandidate;
  isAccepting: boolean;
  isDisabled: boolean;
  onSeek: (seconds: number) => void;
  onAccept: (candidate: ScoutCandidate) => void;
}

function CandidateCard({ rank, candidate, isAccepting, isDisabled, onSeek, onAccept }: CandidateCardProps) {
  const isHeuristic = candidate.source === "heuristic";
  return (
    <motion.li
      variants={{
        hidden: { opacity: 0, y: 14, scale: 0.98 },
        show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: EASE } },
      }}
      className="group/candidate flex flex-col rounded-2xl border border-dashed border-amber/40 bg-linear-to-b from-amber/[0.06] to-transparent p-4 transition-colors hover:border-amber/70"
    >
      <button
        type="button"
        onClick={() => onSeek(candidate.startSeconds)}
        className="w-full flex-1 space-y-2.5 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-amber/60 focus-visible:ring-offset-4 focus-visible:ring-offset-transparent"
        title="Preview this window"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] text-muted-foreground">#{rank}</span>
          <span className="rounded-full border border-white/15 bg-white/[0.06] px-2 py-0.5 text-xs capitalize text-white">
            {candidate.surfaceType}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
              isHeuristic ? "border-amber/40 bg-amber/10 text-amber" : "border-violet/40 bg-violet/15 text-violet-100",
            )}
          >
            {!isHeuristic && <Sparkles className="size-3" aria-hidden />}
            {isHeuristic ? "Heuristic · needs review" : "Gemini"}
          </span>
          <span className="ml-auto inline-flex items-center gap-1 font-mono text-xs text-slate-300">
            <Play className="size-3 text-amber opacity-60 transition-opacity group-hover/candidate:opacity-100" aria-hidden />
            {formatSeconds(candidate.startSeconds)} – {formatSeconds(candidate.endSeconds)}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-slate-200">{candidate.description}</p>
        <ScoreBar score={candidate.placementScore} />
      </button>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
        <span className="text-xs text-muted-foreground">Max prominence {percent(candidate.suggestedMaxProminence)}</span>
        <Button size="sm" disabled={isDisabled} onClick={() => onAccept(candidate)}>
          {isAccepting ? <LoaderCircle className="size-3 animate-spin" aria-hidden /> : <Check className="size-3" aria-hidden />}
          {isAccepting ? "Adding…" : "Accept as ad slot"}
        </Button>
      </div>
    </motion.li>
  );
}

function ScoreBar({ score }: { score: number }) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"
        role="meter"
        aria-label="Placement score"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
      >
        <motion.div
          className="h-full rounded-full bg-linear-to-r from-amber-deep via-amber to-[#ffd59a] shadow-[0_0_12px_rgb(242_165_65/0.7)]"
          initial={{ width: "0%" }}
          whileInView={{ width: `${score}%` }}
          viewport={{ once: true }}
          transition={reduceMotion ? { duration: 0 } : { duration: 1.1, ease: EASE, delay: 0.15 }}
        />
      </div>
      <span className="w-14 text-right font-mono text-xs text-slate-200">
        <CountUp value={score} />
        <span className="text-muted-foreground">/100</span>
      </span>
    </div>
  );
}
