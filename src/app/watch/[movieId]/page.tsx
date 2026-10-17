"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { seedMovies, seedProfiles } from "@/lib/data/seed";
import { GenerationJob, PlaybackManifest, PlaybackSegment } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, LoaderCircle, Pause, Play } from "lucide-react";
import { FadeIn } from "@/components/fx/motion";
import { validSimulatedDate } from "./ad-client";
import { useAdDecisions } from "./use-ad-decisions";
import { useAdTracking } from "./use-ad-tracking";
import { AdPauseCard } from "./ad-pause-card";
import { WhyThisAd } from "./why-this-ad";
import { AdAudio } from "./ad-audio";
import { DateSimulator } from "./date-simulator";
import { ProfilePicker } from "./profile-picker";
import { SegmentStatusCard } from "./segment-status-card";

type PrepareResponse = {
  success: boolean;
  manifest?: PlaybackManifest;
  error?: string;
};

function paramsValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function waitForMetadata(video: HTMLVideoElement) {
  if (video.readyState >= 1) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", handleMetadata);
      video.removeEventListener("error", handleError);
    };
    const handleMetadata = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error("Video metadata failed to load"));
    };

    video.addEventListener("loadedmetadata", handleMetadata, { once: true });
    video.addEventListener("error", handleError, { once: true });
  });
}

function mergeFrozenSegments(
  currentSegments: PlaybackSegment[],
  nextSegments: PlaybackSegment[],
  freezeThroughIndex: number,
) {
  if (currentSegments.length === 0) return nextSegments;

  return nextSegments.map((segment, index) => {
    const current = currentSegments[index];
    if (index <= freezeThroughIndex && current?.id === segment.id) {
      return current;
    }
    return segment;
  });
}

function formatClock(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function NotFoundPanel({ message }: { message: string }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center px-4 py-10">
      <div className="glass flex flex-col items-center gap-4 rounded-3xl p-10 text-center">
        <p className="text-lg font-semibold text-white">{message}</p>
        <Link href="/watch" className="text-sm text-amber transition-colors hover:text-white focus-visible:underline focus-visible:outline-none">
          Back to Projects
        </Link>
      </div>
    </main>
  );
}

type PlaybackMode = "MSE" | "DUAL_VIDEO_FALLBACK" | "MSE_ERROR";

const MSE_ROLLING_AHEAD_SEGMENTS = 2;

export default function WatchMoviePage() {
  const params = useParams();
  const movieId = paramsValue(params.movieId);
  const searchParams = useSearchParams();
  const profileId = searchParams.get("profile");
  const simulatedDate = validSimulatedDate(searchParams.get("date"));

  const movie = seedMovies.find((candidate) => candidate.id === movieId);
  const activeMovie = movie || seedMovies[0];
  const profile = seedProfiles.find((candidate) => candidate.id === profileId);
  const activeProfile = profile || seedProfiles[0];

  const primaryVideoRef = useRef<HTMLVideoElement>(null);
  const secondaryVideoRef = useRef<HTMLVideoElement>(null);
  const mseVideoRef = useRef<HTMLVideoElement>(null);
  const currentSegmentIndexRef = useRef(0);
  const activePlayerIndexRef = useRef(0);
  const isPlayingRef = useRef(false);
  const segmentsRef = useRef<PlaybackSegment[]>([]);
  const playbackModeRef = useRef<PlaybackMode>("MSE");
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const mseObjectUrlRef = useRef<string | null>(null);
  const mseAppendQueueRef = useRef<number[]>([]);
  const mseQueuedKeysRef = useRef<Set<string>>(new Set());
  const mseAppendedKeysRef = useRef<Set<string>>(new Set());
  const mseAppendingRef = useRef(false);
  const highestQueuedSegmentIndexRef = useRef(-1);
  const highestAppendedSegmentIndexRef = useRef(-1);

  const [manifest, setManifest] = useState<PlaybackManifest | null>(null);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [timelineTime, setTimelineTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>("MSE");
  const [mseReady, setMseReady] = useState(false);

  const { slots: adSlots } = useAdDecisions(movieId, profileId, simulatedDate);
  const { activeSlot, showPauseCard, logClick, logAudioPlay } = useAdTracking({
    slots: adSlots,
    timelineTime,
    isPlaying,
    movieId: activeMovie.id,
    profileId: profileId ?? "",
  });
  const seasonLabels = useMemo(
    () => [...new Set(adSlots.flatMap((slot) => (slot.decision.campaign?.seasonLabel ? [slot.decision.campaign.seasonLabel] : [])))],
    [adSlots],
  );

  const segments = useMemo(() => manifest?.segments || [], [manifest]);
  const currentSegment = segments[currentSegmentIndex];
  const displaySegments = segments;
  const displayCurrentSegment = currentSegment;
  const displayTimelineTime = timelineTime;
  const displayIsPlaying = isPlaying;
  const videoRefs = useMemo(() => [primaryVideoRef, secondaryVideoRef], []);
  const firstMseMimeType = segments[0]?.mimeType;

  const videoForIndex = useCallback((index: number) => videoRefs[index].current, [videoRefs]);
  const mseSegmentKey = useCallback((segment: PlaybackSegment) => `${segment.id}:${segment.mseAssetUrl}`, []);

  const switchToDualVideoFallback = useCallback((nextMode: PlaybackMode, reason: unknown) => {
    setError(String(reason));
    playbackModeRef.current = nextMode;
    setPlaybackMode(nextMode);
    setMseReady(false);
    const mseVideo = mseVideoRef.current;
    if (mseVideo) mseVideo.pause();
  }, []);

  useEffect(() => {
    currentSegmentIndexRef.current = currentSegmentIndex;
  }, [currentSegmentIndex]);

  useEffect(() => {
    activePlayerIndexRef.current = activePlayerIndex;
  }, [activePlayerIndex]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  useEffect(() => {
    playbackModeRef.current = playbackMode;
  }, [playbackMode]);

  const fetchManifest = useCallback(async (mode: "replace" | "merge-future") => {
    if (!movieId) return;

    const params = new URLSearchParams({ movieId });
    if (profileId) params.set("profileId", profileId);
    if (simulatedDate) params.set("date", simulatedDate);

    const response = await fetch(`/api/cuts/prepare?${params.toString()}`);
    const data = (await response.json()) as PrepareResponse;

    if (!data.success || !data.manifest) {
      throw new Error(data.error || "Failed to prepare playback manifest");
    }

    setManifest((current) => {
      if (!current || mode === "replace") return data.manifest!;

      const freezeThroughIndex =
        playbackModeRef.current === "MSE"
          ? Math.max(currentSegmentIndexRef.current + 1, highestQueuedSegmentIndexRef.current)
          : currentSegmentIndexRef.current + 1;
      return {
        ...data.manifest!,
        segments: mergeFrozenSegments(current.segments, data.manifest!.segments, freezeThroughIndex),
      };
    });
  }, [movieId, profileId, simulatedDate]);

  useEffect(() => {
    fetchManifest("replace")
      .then(() => {
        setError(null);
        setCurrentSegmentIndex(0);
        setActivePlayerIndex(0);
        setTimelineTime(0);
        setPlaybackMode("MSE");
        playbackModeRef.current = "MSE";
      })
      .catch((err) => setError(String(err)));

    if (profileId) {
      fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId, profileId, ...(simulatedDate ? { date: simulatedDate } : {}) }),
      }).catch((cause: unknown) => console.error("Failed to start generation", cause));
    }
  }, [fetchManifest, movieId, profileId, simulatedDate]);

  useEffect(() => {
    if (!profileId) return;

    const interval = setInterval(() => {
      fetch(`/api/jobs?movieId=${movieId}&profileId=${profileId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.jobs) {
            setJobs(data.jobs);
            return fetchManifest("merge-future");
          }
        })
        .catch((err) => setError(String(err)));
    }, 2000);

    return () => clearInterval(interval);
  }, [fetchManifest, movieId, profileId]);

  const processMseAppendQueue = useCallback(async () => {
    if (mseAppendingRef.current) return;

    const sourceBuffer = sourceBufferRef.current;
    const mediaSource = mediaSourceRef.current;
    if (!sourceBuffer || !mediaSource || sourceBuffer.updating) return;

    mseAppendingRef.current = true;

    try {
      while (mseAppendQueueRef.current.length > 0) {
        const nextIndex = mseAppendQueueRef.current.shift();
        if (nextIndex === undefined) break;

        const segment = segmentsRef.current[nextIndex];
        if (!segment) continue;

        const response = await fetch(segment.mseAssetUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch MSE segment ${segment.mseAssetUrl}: ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        await new Promise<void>((resolve, reject) => {
          const cleanup = () => {
            sourceBuffer.removeEventListener("updateend", handleUpdateEnd);
            sourceBuffer.removeEventListener("error", handleError);
          };
          const handleUpdateEnd = () => {
            cleanup();
            resolve();
          };
          const handleError = () => {
            cleanup();
            reject(new Error(`MSE append failed for ${segment.mseAssetUrl}`));
          };

          sourceBuffer.addEventListener("updateend", handleUpdateEnd, { once: true });
          sourceBuffer.addEventListener("error", handleError, { once: true });
          sourceBuffer.appendBuffer(buffer);
        });

        mseAppendedKeysRef.current.add(mseSegmentKey(segment));
        highestAppendedSegmentIndexRef.current = Math.max(highestAppendedSegmentIndexRef.current, nextIndex);

        if (nextIndex === segmentsRef.current.length - 1 && mediaSource.readyState === "open" && !sourceBuffer.updating) {
          mediaSource.endOfStream();
        }
      }
    } catch (err) {
      switchToDualVideoFallback("MSE_ERROR", err);
      return;
    } finally {
      mseAppendingRef.current = false;
    }
  }, [mseSegmentKey, switchToDualVideoFallback]);

  const queueMseSegmentsThrough = useCallback((targetIndex: number) => {
    const currentSegments = segmentsRef.current;
    const cappedTargetIndex = Math.min(targetIndex, currentSegments.length - 1);

    for (let index = 0; index <= cappedTargetIndex; index++) {
      const segment = currentSegments[index];
      if (!segment) continue;

      const key = mseSegmentKey(segment);
      if (mseQueuedKeysRef.current.has(key) || mseAppendedKeysRef.current.has(key)) continue;

      mseQueuedKeysRef.current.add(key);
      mseAppendQueueRef.current.push(index);
      highestQueuedSegmentIndexRef.current = Math.max(highestQueuedSegmentIndexRef.current, index);
    }

    void processMseAppendQueue();
  }, [mseSegmentKey, processMseAppendQueue]);

  useEffect(() => {
    const video = mseVideoRef.current;
    if (!firstMseMimeType || !video) return;

    if (!("MediaSource" in window) || !MediaSource.isTypeSupported(firstMseMimeType)) {
      queueMicrotask(() => switchToDualVideoFallback("DUAL_VIDEO_FALLBACK", `MSE unsupported: ${firstMseMimeType}`));
      return;
    }

    const mediaSource = new MediaSource();
    const objectUrl = URL.createObjectURL(mediaSource);
    mediaSourceRef.current = mediaSource;
    mseObjectUrlRef.current = objectUrl;
    sourceBufferRef.current = null;
    mseAppendQueueRef.current = [];
    mseQueuedKeysRef.current = new Set();
    mseAppendedKeysRef.current = new Set();
    mseAppendingRef.current = false;
    highestQueuedSegmentIndexRef.current = -1;
    highestAppendedSegmentIndexRef.current = -1;

    video.src = objectUrl;

    const handleSourceOpen = () => {
      try {
        const sourceBuffer = mediaSource.addSourceBuffer(firstMseMimeType);
        sourceBuffer.mode = "sequence";
        sourceBufferRef.current = sourceBuffer;
        setMseReady(true);
        queueMseSegmentsThrough(MSE_ROLLING_AHEAD_SEGMENTS);
      } catch (err) {
        switchToDualVideoFallback("MSE_ERROR", err);
      }
    };

    mediaSource.addEventListener("sourceopen", handleSourceOpen, { once: true });

    return () => {
      mediaSource.removeEventListener("sourceopen", handleSourceOpen);
      setMseReady(false);
      sourceBufferRef.current = null;
      mediaSourceRef.current = null;
      mseAppendQueueRef.current = [];
      mseQueuedKeysRef.current = new Set();
      mseAppendedKeysRef.current = new Set();
      mseAppendingRef.current = false;
      if (mseObjectUrlRef.current) {
        URL.revokeObjectURL(mseObjectUrlRef.current);
        mseObjectUrlRef.current = null;
      }
    };
  }, [firstMseMimeType, queueMseSegmentsThrough, switchToDualVideoFallback]);

  useEffect(() => {
    if (playbackMode !== "MSE" || !mseReady) return;
    queueMseSegmentsThrough(currentSegmentIndex + MSE_ROLLING_AHEAD_SEGMENTS);
  }, [currentSegmentIndex, mseReady, playbackMode, queueMseSegmentsThrough, segments]);

  useEffect(() => {
    if (playbackMode !== "MSE") return;
    if (!mseReady) return;

    const video = mseVideoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch((err) => switchToDualVideoFallback("MSE_ERROR", err));
    } else {
      video.pause();
    }
  }, [isPlaying, mseReady, playbackMode, switchToDualVideoFallback]);

  const handleMseTimeUpdate = () => {
    const video = mseVideoRef.current;
    const currentSegments = segmentsRef.current;
    if (!video || currentSegments.length === 0) return;

    const nextTimelineTime = Math.min(activeMovie.durationSeconds, Math.max(0, video.currentTime));
    setTimelineTime(nextTimelineTime);

    const nextSegmentIndex = currentSegments.findIndex((segment) => nextTimelineTime < segment.timelineEndSeconds);
    const resolvedSegmentIndex = nextSegmentIndex === -1 ? currentSegments.length - 1 : nextSegmentIndex;
    if (resolvedSegmentIndex !== currentSegmentIndexRef.current) {
      currentSegmentIndexRef.current = resolvedSegmentIndex;
      setCurrentSegmentIndex(resolvedSegmentIndex);
    }
  };

  const handleMseEnded = () => {
    const video = mseVideoRef.current;
    if (video) video.currentTime = 0;
    setIsPlaying(false);
    setCurrentSegmentIndex(0);
    currentSegmentIndexRef.current = 0;
    setTimelineTime(0);
  };

  useEffect(() => {
    if (playbackMode === "MSE") return;

    const nextSegment = segments[currentSegmentIndex + 1];
    const standbyVideo = videoForIndex(1 - activePlayerIndex);
    if (!nextSegment || !standbyVideo) return;

    standbyVideo.pause();
    standbyVideo.currentTime = 0;

    if (standbyVideo.getAttribute("src") !== nextSegment.assetUrl) {
      standbyVideo.src = nextSegment.assetUrl;
      standbyVideo.load();
    }
  }, [activePlayerIndex, currentSegmentIndex, playbackMode, segments, videoForIndex]);

  useEffect(() => {
    if (playbackMode === "MSE") return;

    const video = videoForIndex(activePlayerIndex);
    if (!video || !currentSegment) return;

    let cancelled = false;

    const loadSegment = async () => {
      const srcChanged = video.getAttribute("src") !== currentSegment.assetUrl;
      if (srcChanged) {
        video.src = currentSegment.assetUrl;
        video.load();
        await waitForMetadata(video);
        if (cancelled) return;
        video.currentTime = 0;
      }

      if (isPlaying) {
        await video.play();
      } else {
        video.pause();
      }
    };

    loadSegment().catch((err) => setError(String(err)));

    return () => {
      cancelled = true;
    };
  }, [activePlayerIndex, currentSegment, isPlaying, playbackMode, videoForIndex]);

  const handleTimeUpdate = (playerIndex: number) => {
    if (playerIndex !== activePlayerIndexRef.current) return;
    if (playbackModeRef.current === "MSE") return;

    const video = videoForIndex(playerIndex);
    const segment = segmentsRef.current[currentSegmentIndexRef.current];
    if (!video || !segment) return;

    const elapsed = Math.max(0, video.currentTime);
    const nextTimelineTime = Math.min(segment.timelineEndSeconds, segment.timelineStartSeconds + elapsed);
    setTimelineTime(nextTimelineTime);

    const shouldAdvance = video.currentTime >= segment.expectedDurationSeconds || video.ended;

    if (shouldAdvance) {
      handleEnded(playerIndex);
    }
  };

  const handleEnded = (playerIndex: number) => {
    if (playerIndex !== activePlayerIndexRef.current) return;
    if (playbackModeRef.current === "MSE") return;

    const currentSegments = segmentsRef.current;
    const index = currentSegmentIndexRef.current;

    if (index < currentSegments.length - 1) {
      const nextIndex = index + 1;
      const currentVideo = videoForIndex(activePlayerIndexRef.current);
      const nextPlayerIndex = 1 - activePlayerIndexRef.current;
      const nextVideo = videoForIndex(nextPlayerIndex);

      currentVideo?.pause();
      if (nextVideo) {
        nextVideo.currentTime = 0;
        if (isPlayingRef.current) {
          nextVideo.play().catch((err) => setError(String(err)));
        }
      }

      activePlayerIndexRef.current = nextPlayerIndex;
      currentSegmentIndexRef.current = nextIndex;
      setActivePlayerIndex(nextPlayerIndex);
      setCurrentSegmentIndex(nextIndex);
      setTimelineTime(currentSegments[nextIndex].timelineStartSeconds);
    } else {
      setIsPlaying(false);
      setCurrentSegmentIndex(0);
      setTimelineTime(0);
    }
  };

  if (!movie) return <NotFoundPanel message="Movie not found" />;

  if (!profileId) {
    return <ProfilePicker movie={movie} profiles={seedProfiles} date={simulatedDate} />;
  }

  if (!profile) return <NotFoundPanel message="Profile not found" />;

  const progressPercent = Math.min(100, Math.max(0, (displayTimelineTime / activeMovie.durationSeconds) * 100));
  const adaptiveSegments = displaySegments.filter((segment) => segment.type === "ADAPTIVE");

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8 sm:py-10">
      <FadeIn className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <Link
            href={simulatedDate ? `/watch/${movie.id}?date=${simulatedDate}` : `/watch/${movie.id}`}
            className="mb-3 inline-flex items-center gap-1.5 rounded-lg text-sm text-muted-foreground transition-colors hover:text-white focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to Profiles
          </Link>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">{activeMovie.title}</h1>
          <p className="mt-2 text-muted-foreground">
            Personalized for <strong className="font-semibold text-white">{activeProfile.displayName}</strong> ({activeProfile.city}, {activeProfile.languageLabel})
          </p>
        </div>
        <DateSimulator date={simulatedDate} seasonLabels={seasonLabels} />
      </FadeIn>

      <FadeIn delay={0.08} className="relative">
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-[radial-gradient(ellipse_at_30%_40%,rgb(242_165_65/0.35),transparent_60%),radial-gradient(ellipse_at_75%_60%,rgb(139_92_246/0.35),transparent_60%)] blur-3xl transition-opacity duration-1000 ${
            displayIsPlaying ? "opacity-100" : "opacity-60"
          }`}
        />
        <div className="glass relative overflow-hidden rounded-3xl p-1.5 sm:p-2">
          <div className="relative flex aspect-video flex-col items-center justify-center overflow-hidden rounded-2xl bg-black">
            <video
              ref={mseVideoRef}
              className={`absolute inset-0 w-full h-full object-cover ${playbackMode === "MSE" ? "opacity-100" : "opacity-0"}`}
              onTimeUpdate={handleMseTimeUpdate}
              onEnded={handleMseEnded}
              controls={false}
              preload="auto"
              playsInline
            />
            <video
              ref={primaryVideoRef}
              className={`absolute inset-0 w-full h-full object-cover ${playbackMode !== "MSE" && activePlayerIndex === 0 ? "opacity-100" : "opacity-0"}`}
              onTimeUpdate={() => handleTimeUpdate(0)}
              onEnded={() => handleEnded(0)}
              controls={false}
              preload="auto"
              playsInline
            />
            <video
              ref={secondaryVideoRef}
              className={`absolute inset-0 w-full h-full object-cover ${playbackMode !== "MSE" && activePlayerIndex === 1 ? "opacity-100" : "opacity-0"}`}
              onTimeUpdate={() => handleTimeUpdate(1)}
              onEnded={() => handleEnded(1)}
              controls={false}
              preload="auto"
              playsInline
            />

            {!displayCurrentSegment && (
              <div className="shimmer-bg animate-shimmer pointer-events-none absolute inset-0 flex items-center justify-center bg-ink/60 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2 backdrop-blur-md">
                  <LoaderCircle className="size-4 animate-spin text-amber" aria-hidden="true" />
                  Preparing your cut
                </span>
              </div>
            )}

            <div className="pointer-events-none absolute top-4 left-4 rounded-full border border-white/10 bg-black/45 px-3 py-1 font-mono text-[11px] text-white/60 backdrop-blur-md">
              Segment: {displayCurrentSegment?.source || "LOADING"} ({displaySegments.length ? currentSegmentIndex + 1 : 0}/{displaySegments.length}) · {playbackMode}
            </div>

            {activeSlot && <WhyThisAd key={activeSlot.slotId} slot={activeSlot} />}
            <AnimatePresence>
              {showPauseCard && activeSlot && <AdPauseCard key={activeSlot.slotId} slot={activeSlot} onCtaClick={logClick} />}
            </AnimatePresence>
            {adSlots.map((slot) =>
              slot.cut?.audioAssetUrl ? (
                <AdAudio
                  key={`${slot.slotId}:${slot.cut.audioAssetUrl}`}
                  slot={slot}
                  audioUrl={slot.cut.audioAssetUrl}
                  isActive={isPlaying && activeSlot?.slotId === slot.slotId}
                  onPlay={logAudioPlay}
                />
              ) : null,
            )}

            <AnimatePresence>
              {error && (
                <motion.div
                  key="player-error"
                  role="status"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute right-4 bottom-24 z-30 max-w-sm rounded-xl border border-red-400/30 bg-red-950/70 px-3 py-2 text-xs text-red-100 backdrop-blur-md"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 pt-12 sm:p-4 sm:pt-16">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] backdrop-blur-xl sm:gap-4 sm:px-4">
                <button
                  type="button"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-ink shadow-[0_0_24px_-4px_rgb(255_255_255/0.6)] transition-transform hover:scale-105 focus-visible:ring-3 focus-visible:ring-amber/60 focus-visible:outline-none active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
                  onClick={() => setIsPlaying((value) => !value)}
                  disabled={!displayCurrentSegment}
                  aria-label={displayIsPlaying ? "Pause" : "Play"}
                >
                  {displayIsPlaying ? <Pause className="size-4 fill-current" /> : <Play className="ml-0.5 size-4 fill-current" />}
                </button>
                <span className="w-10 shrink-0 text-right font-mono text-[11px] text-white/80 tabular-nums sm:w-12 sm:text-xs">
                  {formatClock(displayTimelineTime)}
                </span>
                <div
                  className="relative h-1.5 flex-1 rounded-full bg-white/15"
                  role="progressbar"
                  aria-label="Playback progress"
                  aria-valuemin={0}
                  aria-valuemax={Math.round(activeMovie.durationSeconds)}
                  aria-valuenow={Math.round(displayTimelineTime)}
                >
                  {adSlots.map((slot) => (
                    <span
                      key={`marker-${slot.slotId}`}
                      aria-hidden="true"
                      className="absolute top-1/2 h-2.5 w-0.5 -translate-y-1/2 rounded-full bg-violet/80"
                      style={{ left: `${Math.min(100, (slot.startSeconds / activeMovie.durationSeconds) * 100)}%` }}
                    />
                  ))}
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#ffbe5c] to-amber shadow-[0_0_12px_rgb(242_165_65/0.7)] transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                  <div
                    aria-hidden="true"
                    className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-amber shadow-[0_0_14px_rgb(242_165_65/0.9)] transition-all duration-300"
                    style={{ left: `${progressPercent}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 font-mono text-[11px] text-white/50 tabular-nums sm:w-12 sm:text-xs">
                  {formatClock(activeMovie.durationSeconds)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.14}>
        <section className="glass rounded-3xl p-5 sm:p-6" aria-labelledby="segment-status-heading">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <h3 id="segment-status-heading" className="text-sm font-semibold tracking-[0.2em] text-white/80 uppercase">
              Segment Status
            </h3>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground">
              <span aria-hidden="true" className={`size-1.5 rounded-full ${manifest ? "bg-mint" : "animate-pulse bg-sky-300"}`} />
              Manifest: {manifest ? new Date(manifest.preparedAt).toLocaleTimeString() : "Preparing"}
            </span>
          </div>
          {adaptiveSegments.length === 0 && !manifest ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3" aria-hidden="true">
              {[0, 1, 2].map((placeholder) => (
                <div key={placeholder} className="shimmer-bg animate-shimmer h-28 rounded-2xl border border-white/10 bg-white/[0.03]" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {adaptiveSegments.map((segment) => (
                <SegmentStatusCard
                  key={segment.id}
                  segment={segment}
                  job={jobs.find((candidate) => candidate.slotId === segment.slotId)}
                  adSlot={adSlots.find((slot) => slot.slotId === segment.slotId)}
                />
              ))}
            </div>
          )}
        </section>
      </FadeIn>
    </main>
  );
}
