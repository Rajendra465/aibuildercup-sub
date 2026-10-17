"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LoaderCircle, RefreshCw, Users } from "lucide-react";
import type { AdDecision, GenerationJobStatus, ViewerProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { errorMessage, fetchJson } from "./director-api";
import { StatusMessage, type Status } from "./status-message";
import { InspectorSection } from "./inspector-section";
import { Shimmer } from "./shimmer";

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
  CAMPAIGN: "border-amber/50 bg-amber/10 text-amber",
  PUBLIC_SERVICE: "border-mint/40 bg-mint/10 text-mint",
  NEUTRAL: "border-white/20 bg-white/[0.06] text-slate-200",
  NONE: "border-white/10 bg-transparent text-muted-foreground",
};

const SKELETON_ROWS = 3;

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

  const refreshButton = (
    <Button size="icon-sm" variant="ghost" onClick={load} disabled={isLoading} title="Refresh decisions">
      {isLoading ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
      <span className="sr-only">Refresh decisions</span>
    </Button>
  );

  return (
    <InspectorSection id={`who-${slotId}`} title="Who sees what" icon={Users} tone="azure" actions={refreshButton}>
      <div className="space-y-2">
        <StatusMessage status={status} />
        {isLoading && rows.length === 0 ? (
          <ul className="space-y-2" aria-label="Loading decisions">
            {Array.from({ length: Math.max(SKELETON_ROWS, Math.min(profiles.length, 5)) }, (_, index) => (
              <li key={index} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                <Shimmer className="size-7 rounded-full" />
                <Shimmer className="h-3 flex-1" />
                <Shimmer className="h-5 w-20 rounded-full" />
              </li>
            ))}
          </ul>
        ) : (
          <ul className={cn("space-y-2 transition-opacity", isLoading && "opacity-60")}>
            {rows.map(({ profile, entry, error }, index) => (
              <motion.li
                key={profile.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.04 }}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className="grid size-7 shrink-0 place-items-center rounded-full bg-linear-to-br from-azure/60 to-violet/60 text-[11px] font-semibold text-white"
                    >
                      {profile.displayName.charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate text-slate-100">
                      {profile.displayName} · {profile.city}
                    </span>
                  </span>
                  {entry ? (
                    <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium", DECISION_BADGE[entry.decision.kind])}>
                      {decisionLabel(entry.decision)}
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-xs text-muted-foreground">
                      {error ? "Error" : "Disabled slot"}
                    </span>
                  )}
                </div>
                {entry?.decision.reasons[0] && <p className="mt-1.5 pl-9.5 text-xs leading-relaxed text-slate-400">{entry.decision.reasons[0]}</p>}
                {entry && (
                  <p className="mt-0.5 pl-9.5 text-xs text-muted-foreground/70">
                    {entry.cut ? `Cut ${entry.cut.status.toLowerCase()}${entry.cut.approved ? " · approved" : ""}` : "No cut rendered for this pick yet"}
                  </p>
                )}
                {error && <p className="mt-1 pl-9.5 text-xs text-red-300">{error}</p>}
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </InspectorSection>
  );
}
