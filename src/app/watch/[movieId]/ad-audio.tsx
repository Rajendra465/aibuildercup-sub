"use client";

import { useEffect, useRef } from "react";
import { AdSlotInfo } from "./ad-client";

const AD_AUDIO_VOLUME = 0.35;

interface AdAudioProps {
  slot: AdSlotInfo;
  audioUrl: string;
  /** True while the playhead is inside the slot and the video is playing. */
  isActive: boolean;
  onPlay: (slot: AdSlotInfo) => void;
}

/** Diegetic audio ad: a hidden track mixed under the scene while the slot is on screen. */
export function AdAudio({ slot, audioUrl, isActive, onPlay }: AdAudioProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = AD_AUDIO_VOLUME;

    if (!isActive) {
      audio.pause();
      return;
    }

    audio
      .play()
      .then(() => onPlay(slot))
      .catch((cause: unknown) => {
        // A pause() racing a pending play() rejects with AbortError — expected, not a failure.
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        console.error("Ad audio playback failed", cause);
      });
  }, [isActive, onPlay, slot]);

  return <audio ref={audioRef} src={audioUrl} preload="auto" className="hidden" />;
}
