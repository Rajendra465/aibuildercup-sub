"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { seedMovies, seedSlots, seedProfiles } from "@/lib/data/seed";
import { PlaybackManifest, PlaybackSegment, ViewerProfile } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, LoaderCircle, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/fx/motion";
import { StatusChip } from "@/app/watch/[movieId]/status-chip";
import { decisionLabel, findActiveAdSlot, validSimulatedDate } from "@/app/watch/[movieId]/ad-client";
import { useAdDecisions } from "@/app/watch/[movieId]/use-ad-decisions";

const DEFAULT_COMPARE_COUNT = 3;

interface CutPlayerProps {
  movieId: string;
  profile: ViewerProfile;
  date: string | null;
  playing: boolean;
  seekSeconds: number;
  seekRevision: number;
}

function CutPlayer({ movieId, profile, date, playing, seekSeconds, seekRevision }: CutPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const readyRef = useRef(false);
  const segmentsRef = useRef<PlaybackSegment[]>([]);
  const playingRef = useRef(playing);
  const seekSecondsRef = useRef(seekSeconds);
  const [manifest, setManifest] = useState<PlaybackManifest | null>(null);
  const [timelineTime, setTimelineTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const segments = useMemo(() => manifest?.segments || [], [manifest]);
  const manifestKey = useMemo(() => segments.map((segment) => segment.mseAssetUrl).join("|"), [segments]);
  const mimeType = segments[0]?.mimeType;
  const currentSegment = segments.find((segment) => timelineTime < segment.timelineEndSeconds) || segments.at(-1);
  const { slots: adSlots } = useAdDecisions(movieId, profile.id, date);
  const activeAdSlot = findActiveAdSlot(adSlots, timelineTime);

  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  useEffect(() => {
    playingRef.current = playing;
    seekSecondsRef.current = seekSeconds;
  }, [playing, seekSeconds]);

  const loadManifest = useCallback(async () => {
    try {
      await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId, profileId: profile.id, ...(date ? { date } : {}) }),
      });
      const query = new URLSearchParams({ movieId, profileId: profile.id });
      if (date) query.set("date", date);
      const response = await fetch(`/api/cuts/prepare?${query.toString()}`);
      const data = await response.json();
      if (!data.success || !data.manifest) throw new Error(data.error || "Unable to prepare cut");
      setManifest(data.manifest);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to prepare cut");
    }
  }, [movieId, profile.id, date]);

  useEffect(() => {
    const initialLoad = window.setTimeout(loadManifest, 0);
    const interval = window.setInterval(loadManifest, 3000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [loadManifest]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !mimeType || !manifestKey) return;
    if (!("MediaSource" in window) || !MediaSource.isTypeSupported(mimeType)) {
      queueMicrotask(() => setError(`MSE unsupported: ${mimeType}`));
      return;
    }

    const mediaSource = new MediaSource();
    const objectUrl = URL.createObjectURL(mediaSource);
    mediaSourceRef.current = mediaSource;
    objectUrlRef.current = objectUrl;
    readyRef.current = false;
    video.src = objectUrl;

    const appendSegments = async () => {
      try {
        const sourceBuffer = mediaSource.addSourceBuffer(mimeType);
        sourceBuffer.mode = "sequence";
        for (const segment of segmentsRef.current) {
          const response = await fetch(segment.mseAssetUrl);
          if (!response.ok) throw new Error(`Failed to load ${segment.mseAssetUrl}`);
          const buffer = await response.arrayBuffer();
          await new Promise<void>((resolve, reject) => {
            sourceBuffer.addEventListener("updateend", () => resolve(), { once: true });
            sourceBuffer.addEventListener("error", () => reject(new Error(`Failed to append ${segment.mseAssetUrl}`)), { once: true });
            sourceBuffer.appendBuffer(buffer);
          });
        }
        if (mediaSource.readyState === "open") mediaSource.endOfStream();
        readyRef.current = true;
        video.currentTime = seekSecondsRef.current;
        if (playingRef.current) await video.play();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Cut playback failed");
      }
    };

    mediaSource.addEventListener("sourceopen", appendSegments, { once: true });
    return () => {
      readyRef.current = false;
      mediaSource.removeEventListener("sourceopen", appendSegments);
      video.pause();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
      mediaSourceRef.current = null;
    };
  }, [manifestKey, mimeType]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !readyRef.current) return;
    if (playing) video.play().catch((cause) => setError(String(cause)));
    else video.pause();
  }, [playing]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !readyRef.current) return;
    video.currentTime = seekSeconds;
  }, [seekRevision, seekSeconds]);

  const isGenerated = currentSegment?.source === "GENERATED_CLIP";

  return (
    <article className="glass group/cut flex h-full flex-col overflow-hidden rounded-3xl transition-[border-color,box-shadow] duration-500 hover:border-white/25 hover:shadow-[0_24px_60px_-24px_rgb(139_92_246/0.5)]">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber to-violet font-display text-xs font-bold text-ink"
          >
            {profile.displayName.slice(0, 2).toUpperCase()}
          </span>
          <div className="truncate font-semibold text-white">
            {profile.displayName} · {profile.city}
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[11px] text-white/70">
          {profile.languageLabel}
        </span>
      </header>
      <div className="relative aspect-video bg-black">
        <video ref={videoRef} className="size-full object-contain" playsInline onTimeUpdate={(event) => setTimelineTime(event.currentTarget.currentTime)} />
        <AnimatePresence>
          {activeAdSlot && (
            <motion.div
              key={activeAdSlot.slotId}
              initial={{ opacity: 0, y: -6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute top-2 right-2 rounded-full border border-amber/50 bg-black/50 px-2.5 py-0.5 text-[11px] font-medium text-amber shadow-[0_0_20px_-6px_rgb(242_165_65/0.7)] backdrop-blur-md"
            >
              {decisionLabel(activeAdSlot.decision)}
            </motion.div>
          )}
        </AnimatePresence>
        {!manifest && (
          <div className="shimmer-bg animate-shimmer absolute inset-0 flex items-center justify-center gap-2 bg-ink/60 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin text-amber" /> Preparing cut
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-3 text-xs text-muted-foreground">
        <span className="truncate">{currentSegment?.label || "Canonical scene"}</span>
        <StatusChip status={isGenerated ? "READY" : "FALLBACK"} label={isGenerated ? "Generated" : "Fallback"} />
      </div>
      {adSlots.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-3">
          {adSlots.map((slot) => (
            <span
              key={slot.slotId}
              className="inline-flex items-center rounded-full border border-amber/30 bg-amber/5 px-2.5 py-0.5 text-[11px] text-amber"
              title={slot.label}
            >
              {decisionLabel(slot.decision)}
              {slot.cut?.exposure ? ` · ${Math.round(slot.cut.exposure.score)}` : ""}
            </span>
          ))}
        </div>
      )}
      {error && <div className="px-4 pb-3 text-xs text-red-300">{error}</div>}
    </article>
  );
}

export default function CompareMoviePage() {
  const { movieId } = useParams();
  const resolvedMovieId = Array.isArray(movieId) ? movieId[0] : movieId;
  const movie = seedMovies.find((candidate) => candidate.id === resolvedMovieId);
  const movieSlots = seedSlots.filter((slot) => slot.movieId === movie?.id);
  const date = validSimulatedDate(useSearchParams().get("date"));
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    seedProfiles.slice(0, DEFAULT_COMPARE_COUNT).map((profile) => profile.id),
  );
  const selectedProfiles = seedProfiles.filter((profile) => selectedIds.includes(profile.id));

  const toggleProfile = (profileId: string) => {
    setSelectedIds((current) =>
      current.includes(profileId) ? current.filter((id) => id !== profileId) : [...current, profileId],
    );
  };
  const [isPlaying, setIsPlaying] = useState(false);
  const [seekSeconds, setSeekSeconds] = useState(0);
  const [seekRevision, setSeekRevision] = useState(0);

  const jumpToSlot = (slotId: string) => {
    const slot = movieSlots.find((candidate) => candidate.id === slotId);
    if (!slot) return;
    setSeekSeconds(slot.startSeconds);
    setSeekRevision((revision) => revision + 1);
  };

  if (!movie) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center px-4 py-10">
        <div className="glass flex flex-col items-center gap-4 rounded-3xl p-10 text-center">
          <p className="text-lg font-semibold text-white">Movie not found</p>
          <Link href="/compare" className="text-sm text-amber transition-colors hover:text-white focus-visible:underline focus-visible:outline-none">
            Back to Projects
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-6 px-4 py-8 sm:px-8 sm:py-10">
      <FadeIn className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/compare"
            className="mb-3 inline-flex items-center gap-1.5 rounded-lg text-sm text-muted-foreground transition-colors hover:text-white focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to Projects
          </Link>
          <p className="mb-2 text-xs font-semibold tracking-[0.3em] text-amber uppercase">Multi-viewer</p>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            Compare Cuts: <span className="text-gradient">{movie.title}</span>
          </h1>
          {date && (
            <p className="mt-3 inline-flex rounded-full border border-amber/40 bg-amber/10 px-3 py-1 text-xs text-amber">
              Simulated date: {date}
            </p>
          )}
        </div>
        <Button className="h-10 px-5" onClick={() => setIsPlaying((value) => !value)}>
          {isPlaying ? <Pause className="fill-current" aria-hidden="true" /> : <Play className="fill-current" aria-hidden="true" />}
          {isPlaying ? "Pause All" : "Play All"}
        </Button>
      </FadeIn>

      <FadeIn delay={0.06}>
        <div className="glass flex flex-wrap items-center gap-2 rounded-2xl p-3" role="group" aria-label="Profiles to compare">
          <span className="mr-1 px-1 text-xs tracking-[0.2em] text-muted-foreground uppercase">Compare</span>
          {seedProfiles.map((profile) => {
            const isSelected = selectedIds.includes(profile.id);
            return (
              <motion.button
                layout
                key={profile.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggleProfile(profile.id)}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors focus-visible:ring-3 focus-visible:ring-amber/40 focus-visible:outline-none ${
                  isSelected
                    ? "border-amber/70 bg-amber/15 text-amber shadow-[0_0_20px_-6px_rgb(242_165_65/0.7)]"
                    : "border-white/12 bg-white/[0.03] text-muted-foreground hover:border-white/25 hover:text-white"
                }`}
              >
                <AnimatePresence initial={false}>
                  {isSelected && (
                    <motion.span
                      key="check"
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: "auto", opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      className="inline-flex overflow-hidden"
                      aria-hidden="true"
                    >
                      <Check className="size-3.5" />
                    </motion.span>
                  )}
                </AnimatePresence>
                {profile.displayName} · {profile.city}
              </motion.button>
            );
          })}
        </div>
      </FadeIn>

      {selectedProfiles.length === 0 ? (
        <FadeIn>
          <p className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">Pick at least one profile to compare.</p>
        </FadeIn>
      ) : (
        <motion.div layout className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {selectedProfiles.map((profile, index) => (
              <motion.div
                key={profile.id}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: index * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] } }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              >
                <CutPlayer movieId={movie.id} profile={profile} date={date} playing={isPlaying} seekSeconds={seekSeconds} seekRevision={seekRevision} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {movieSlots.length > 0 && (
        <FadeIn delay={0.1}>
          <div className="flex flex-col items-center gap-3 pt-2">
            <span className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Jump to scene</span>
            <div className="flex flex-wrap justify-center gap-2">
              {movieSlots.map((slot) => (
                <Button key={slot.id} variant="outline" className="h-9 px-4" onClick={() => jumpToSlot(slot.id)}>
                  {slot.label}
                </Button>
              ))}
            </div>
          </div>
        </FadeIn>
      )}
    </main>
  );
}
