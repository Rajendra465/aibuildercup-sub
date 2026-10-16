"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Radar } from "lucide-react";
import type { AdaptiveSlot, ScoutCandidate } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AD_ACCENT, errorMessage, fetchJson, formatSeconds, jsonInit, percent, reloadWithFlash } from "./director-api";
import { StatusMessage, type Status } from "./status-message";

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
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Radar className="size-5" style={{ color: AD_ACCENT }} aria-hidden />
            Slot Scout
          </CardTitle>
          <p className="text-xs text-slate-400 mt-1">
            Gemini finds billboards, screens and signs where a brand could sit without touching the story.
          </p>
        </div>
        <Button
          onClick={handleScout}
          disabled={isScouting}
          className="shrink-0 text-zinc-950 hover:opacity-90"
          style={{ backgroundColor: AD_ACCENT }}
        >
          {isScouting ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Radar className="size-4" aria-hidden />}
          {isScouting ? "Scouting…" : "Scout ad surfaces with Gemini"}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <StatusMessage status={status} onDismiss={isScouting ? undefined : () => setStatus(null)} />
        {candidates.length === 0 ? (
          <p className="text-sm text-zinc-500">No candidates yet. Run the scout to find ad surfaces.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {candidates.map((candidate) => (
              <CandidateRow
                key={candidate.id}
                candidate={candidate}
                isAccepting={acceptingId === candidate.id}
                isDisabled={acceptingId !== null}
                onSeek={onSeek}
                onAccept={handleAccept}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

interface CandidateRowProps {
  candidate: ScoutCandidate;
  isAccepting: boolean;
  isDisabled: boolean;
  onSeek: (seconds: number) => void;
  onAccept: (candidate: ScoutCandidate) => void;
}

function CandidateRow({ candidate, isAccepting, isDisabled, onSeek, onAccept }: CandidateRowProps) {
  const isHeuristic = candidate.source === "heuristic";
  return (
    <li className="rounded-md border border-dashed bg-zinc-950 p-3" style={{ borderColor: `${AD_ACCENT}66` }}>
      <button
        type="button"
        onClick={() => onSeek(candidate.startSeconds)}
        className="w-full text-left space-y-2"
        title="Preview this window"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-slate-300">
            {formatSeconds(candidate.startSeconds)} – {formatSeconds(candidate.endSeconds)}
          </span>
          <Badge variant="outline" className="border-zinc-700 capitalize text-slate-200">{candidate.surfaceType}</Badge>
          <Badge
            variant="outline"
            className={isHeuristic ? "border-amber-700 text-amber-300" : "border-emerald-800 text-emerald-300"}
          >
            {isHeuristic ? "Heuristic · needs review" : "Gemini"}
          </Badge>
          <span className="ml-auto text-xs text-slate-400">Max prominence {percent(candidate.suggestedMaxProminence)}</span>
        </div>
        <p className="text-sm text-slate-300">{candidate.description}</p>
        <div className="flex items-center gap-2">
          <div
            className="h-1.5 flex-1 rounded-full bg-zinc-800 overflow-hidden"
            role="meter"
            aria-label="Placement score"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={candidate.placementScore}
          >
            <div className="h-full rounded-full" style={{ width: `${candidate.placementScore}%`, backgroundColor: AD_ACCENT }} />
          </div>
          <span className="w-12 text-right font-mono text-xs text-slate-300">{candidate.placementScore}/100</span>
        </div>
      </button>
      <div className="mt-2 flex justify-end">
        <Button
          size="sm"
          variant="outline"
          disabled={isDisabled}
          onClick={() => onAccept(candidate)}
          className="hover:bg-zinc-800"
          style={{ borderColor: AD_ACCENT, color: AD_ACCENT }}
        >
          {isAccepting && <LoaderCircle className="size-3 animate-spin" aria-hidden />}
          {isAccepting ? "Adding…" : "Accept as ad slot"}
        </Button>
      </div>
    </li>
  );
}
