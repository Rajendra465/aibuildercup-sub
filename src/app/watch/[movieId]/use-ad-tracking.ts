"use client";

import { useCallback, useEffect, useRef } from "react";
import { AdEventPayload, AdSlotInfo, findActiveAdSlot, isBrandedDecision, logAdEvent } from "./ad-client";

/** A backwards jump larger than this (seconds) is treated as a new playback. */
const RESTART_JUMP_SECONDS = 1;

interface AdTrackingOptions {
  slots: AdSlotInfo[];
  timelineTime: number;
  isPlaying: boolean;
  movieId: string;
  profileId: string;
}

interface AdTrackingResult {
  activeSlot: AdSlotInfo | undefined;
  showPauseCard: boolean;
  logClick: (slot: AdSlotInfo) => void;
  logAudioPlay: (slot: AdSlotInfo) => void;
}

function eventFor(type: AdEventPayload["type"], slot: AdSlotInfo, movieId: string, profileId: string): AdEventPayload | null {
  const campaign = slot.decision.campaign;
  if (!campaign) return null;
  return {
    type,
    campaignId: campaign.id,
    movieId,
    slotId: slot.slotId,
    profileId,
    exposureScore: slot.cut?.exposure?.score,
  };
}

/**
 * Tracks the ad slot under the playhead and logs IMPRESSION / PAUSE_VIEW / CLICK /
 * AUDIO_PLAY events, each at most once per slot per playback (per pause for PAUSE_VIEW).
 */
export function useAdTracking({ slots, timelineTime, isPlaying, movieId, profileId }: AdTrackingOptions): AdTrackingResult {
  const impressedRef = useRef<Set<string>>(new Set());
  const audioLoggedRef = useRef<Set<string>>(new Set());
  const pauseLoggedRef = useRef(false);
  const lastTimeRef = useRef(0);

  const activeSlot = findActiveAdSlot(slots, timelineTime);
  const isBranded = Boolean(activeSlot && isBrandedDecision(activeSlot.decision));
  const showPauseCard = !isPlaying && timelineTime > 0 && isBranded;

  useEffect(() => {
    if (timelineTime + RESTART_JUMP_SECONDS < lastTimeRef.current) {
      impressedRef.current = new Set();
      audioLoggedRef.current = new Set();
    }
    lastTimeRef.current = timelineTime;
  }, [timelineTime]);

  useEffect(() => {
    if (!activeSlot || !isPlaying || !isBranded) return;
    if (impressedRef.current.has(activeSlot.slotId)) return;
    const payload = eventFor("IMPRESSION", activeSlot, movieId, profileId);
    if (!payload) return;
    impressedRef.current.add(activeSlot.slotId);
    logAdEvent(payload);
  }, [activeSlot, isBranded, isPlaying, movieId, profileId]);

  useEffect(() => {
    if (isPlaying) {
      pauseLoggedRef.current = false;
      return;
    }
    if (!showPauseCard || !activeSlot || pauseLoggedRef.current) return;
    const payload = eventFor("PAUSE_VIEW", activeSlot, movieId, profileId);
    if (!payload) return;
    pauseLoggedRef.current = true;
    logAdEvent(payload);
  }, [activeSlot, isPlaying, movieId, profileId, showPauseCard]);

  const logClick = useCallback(
    (slot: AdSlotInfo) => {
      const payload = eventFor("CLICK", slot, movieId, profileId);
      if (payload) logAdEvent(payload);
    },
    [movieId, profileId],
  );

  const logAudioPlay = useCallback(
    (slot: AdSlotInfo) => {
      if (audioLoggedRef.current.has(slot.slotId)) return;
      const payload = eventFor("AUDIO_PLAY", slot, movieId, profileId);
      if (!payload) return;
      audioLoggedRef.current.add(slot.slotId);
      logAdEvent(payload);
    },
    [movieId, profileId],
  );

  return { activeSlot, showPauseCard, logClick, logAudioPlay };
}
