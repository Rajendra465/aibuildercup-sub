"use client";

import { useEffect, useState } from "react";
import { AdSlotInfo, fetchAdDecisions } from "./ad-client";

const DECISIONS_POLL_MS = 3000;

interface AdDecisionsState {
  slots: AdSlotInfo[];
  error: string | null;
}

/** Polls /api/ads/decisions so exposure scores and audio appear once cuts finish rendering. */
export function useAdDecisions(movieId: string | undefined, profileId: string | null, date: string | null): AdDecisionsState {
  const [state, setState] = useState<AdDecisionsState>({ slots: [], error: null });

  useEffect(() => {
    if (!movieId || !profileId) return;
    let cancelled = false;

    const load = () => {
      fetchAdDecisions(movieId, profileId, date)
        .then((slots) => {
          if (!cancelled) setState({ slots, error: null });
        })
        .catch((cause: unknown) => {
          if (cancelled) return;
          console.error("Failed to load ad decisions", cause);
          setState((current) => ({ ...current, error: cause instanceof Error ? cause.message : "Ad decisions unavailable" }));
        });
    };

    const initial = window.setTimeout(load, 0);
    const interval = window.setInterval(load, DECISIONS_POLL_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [movieId, profileId, date]);

  return state;
}
