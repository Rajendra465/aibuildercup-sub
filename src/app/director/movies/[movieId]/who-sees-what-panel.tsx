"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, RefreshCw, Users } from "lucide-react";
import type { AdDecision, GenerationJobStatus, ViewerProfile } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AD_ACCENT, errorMessage, fetchJson } from "./director-api";
import { StatusMessage, type Status } from "./status-message";

interface WhoSeesWhatPanelProps {
  movieId: string;
  slotId: string;
  profiles: ViewerProfile[];
}

interface DecisionSlot {
  slotId: string;
  decision: AdDecision;
  cut: { jobId: string; status: GenerationJobStatus; approved: boolean } | null;
}

interface DecisionsResponse {
  date: string;
  slots: DecisionSlot[];
}

interface ProfileRow {
  profile: ViewerProfile;
  entry: DecisionSlot | null;
  error?: string;
}

function decisionLabel(decision: AdDecision): string {
  if (decision.kind === "CAMPAIGN") return decision.campaign?.brandName ?? decision.adKey;
  if (decision.kind === "PUBLIC_SERVICE") return `PSA · ${decision.campaign?.brandName ?? decision.adKey}`;
  if (decision.kind === "NEUTRAL") return "Neutral artwork";
  return "No ad";
}

const DECISION_BADGE: Record<AdDecision["kind"], string> = {
  CAMPAIGN: "border-amber-600 text-amber-200",
  PUBLIC_SERVICE: "border-emerald-700 text-emerald-300",
  NEUTRAL: "border-zinc-600 text-slate-300",
  NONE: "border-zinc-700 text-zinc-500",
};

async function loadRow(movieId: string, slotId: string, profile: ViewerProfile): Promise<ProfileRow> {
  try {
    const query = new URLSearchParams({ movieId, profileId: profile.id });
    const data = await fetchJson<DecisionsResponse>(`/api/ads/decisions?${query.toString()}`);
    return { profile, entry: data.slots.find((slot) => slot.slotId === slotId) ?? null };
  } catch (error) {
    return { profile, entry: null, error: errorMessage(error, "Decision unavailable") };
  }
}

export function WhoSeesWhatPanel({ movieId, slotId, profiles }: WhoSeesWhatPanelProps) {
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<Status | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    const next = await Promise.all(profiles.map((profile) => loadRow(movieId, slotId, profile)));
    setRows(next);
    const failed = next.filter((row) => row.error).length;
    setStatus(failed ? { tone: "error", text: `Could not load decisions for ${failed} profile(s).` } : null);
    setIsLoading(false);
  }, [movieId, slotId, profiles]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <section className="space-y-2" aria-labelledby={`who-${slotId}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 id={`who-${slotId}`} className="flex items-center gap-2 font-semibold text-slate-100">
          <Users className="size-4" style={{ color: AD_ACCENT }} aria-hidden />
          Who sees what
        </h3>
        <Button size="icon-sm" variant="ghost" onClick={load} disabled={isLoading} title="Refresh decisions">
          {isLoading ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          <span className="sr-only">Refresh decisions</span>
        </Button>
      </div>
      <StatusMessage status={status} />
      <ul className="space-y-1.5">
        {rows.map(({ profile, entry, error }) => (
          <li key={profile.id} className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-slate-200">
                {profile.displayName} · {profile.city}
              </span>
              {entry ? (
                <Badge variant="outline" className={DECISION_BADGE[entry.decision.kind]}>
                  {decisionLabel(entry.decision)}
                </Badge>
              ) : (
                <Badge variant="outline" className="border-zinc-700 text-zinc-500">{error ? "Error" : "Disabled slot"}</Badge>
              )}
            </div>
            {entry?.decision.reasons[0] && <p className="mt-1 text-xs text-slate-400">{entry.decision.reasons[0]}</p>}
            {entry && (
              <p className="mt-0.5 text-xs text-zinc-500">
                {entry.cut ? `Cut ${entry.cut.status.toLowerCase()}${entry.cut.approved ? " · approved" : ""}` : "No cut rendered for this pick yet"}
              </p>
            )}
            {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
