"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Clock, Layers, LoaderCircle, Megaphone, Scissors } from "lucide-react";
import { exportSegmentsAction } from "@/app/actions";
import { seedMovies, seedSlots, seedProfiles } from "@/lib/data/seed";
import type { Campaign, GenerationJob, ScoutCandidate } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { MotionRoot, Reveal } from "../../director-motion";
import { errorMessage, fetchJson, jsonInit, reloadWithFlash, takeFlash } from "./director-api";
import { StatusMessage, type Status } from "./status-message";
import { SlotScoutPanel } from "./slot-scout-panel";
import { VideoStage } from "./video-stage";
import { TimelineTrack } from "./timeline-track";
import { SegmentDialog } from "./segment-dialog";
import { InspectorEmptyState, SegmentInspector } from "./segment-inspector";
import { formatClock } from "./editor-theme";

interface JobsResponse {
  jobs: GenerationJob[];
}

interface CampaignsResponse {
  campaigns: Campaign[];
}

const FRAME_TIME = 1 / 24; // Assuming 24fps

export default function DirectorMoviePage() {
  const { movieId } = useParams();
  const routeMovieId = Array.isArray(movieId) ? movieId[0] : movieId;
  const selectedMovie = seedMovies.find((candidate) => candidate.id === routeMovieId);
  const movie = selectedMovie || seedMovies[0];
  const slots = seedSlots.filter((slot) => slot.movieId === movie?.id);

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(slots[0]?.id || null);
  const [isExporting, setIsExporting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const [selectedProfileId, setSelectedProfileId] = useState(seedProfiles[0]?.id || "");
  const [variants, setVariants] = useState<GenerationJob[]>([]);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [pageStatus, setPageStatus] = useState<Status | null>(null);
  const [inspectorStatus, setInspectorStatus] = useState<Status | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [scoutCandidates, setScoutCandidates] = useState<ScoutCandidate[]>([]);
  const [brandNames, setBrandNames] = useState<ReadonlyMap<string, string>>(new Map());

  const selectedSlot = slots.find(s => s.id === selectedSlotId);

  useEffect(() => {
    const flash = takeFlash();
    if (!flash) return;
    const timer = window.setTimeout(() => setPageStatus({ tone: "success", text: flash }), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchJson<CampaignsResponse>("/api/campaigns")
      .then((data) => {
        if (!cancelled) setBrandNames(new Map(data.campaigns.map((campaign) => [campaign.id, campaign.brandName])));
      })
      .catch(() => {
        // Brand names are cosmetic; variant cards fall back to the campaign id.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadVariants = useCallback(async () => {
    try {
      const data = await fetchJson<JobsResponse>(`/api/jobs?movieId=${encodeURIComponent(movie.id)}`);
      setVariants(data.jobs);
    } catch {
      // Polling retries every few seconds; a transient failure is not worth surfacing.
    }
  }, [movie.id]);

  useEffect(() => {
    const initialLoad = window.setTimeout(loadVariants, 0);
    const interval = window.setInterval(loadVariants, 3000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [loadVariants]);

  const handleJobUpdated = useCallback((job: GenerationJob) => {
    setVariants((current) => current.map((entry) => (entry.id === job.id ? job : entry)));
  }, []);

  const handleRegenerate = async () => {
    if (!selectedSlot || !selectedProfileId) return;
    setIsRegenerating(true);
    setInspectorStatus(null);
    try {
      await fetchJson<object>(
        "/api/generate",
        jsonInit("POST", { movieId: movie.id, profileId: selectedProfileId, slotId: selectedSlot.id, force: true }),
      );
      await loadVariants();
    } catch (error) {
      setInspectorStatus({ tone: "error", text: errorMessage(error, "Generation failed") });
    } finally {
      setIsRegenerating(false);
    }
  };

  const selectedVariants = variants
    .filter((variant) => variant.slotId === selectedSlotId)
    .sort((left, right) => new Date(right.createdAt || right.startedAt || 0).getTime() - new Date(left.createdAt || left.startedAt || 0).getTime());

  const handleExport = async () => {
    setIsExporting(true);
    setPageStatus({ tone: "info", text: "Cutting fallback segments with ffmpeg…" });
    try {
      const res = await exportSegmentsAction(movie.id);
      setPageStatus(
        res.success
          ? { tone: "success", text: "Fallback segments exported." }
          : { tone: "error", text: `Export failed: ${res.error}` },
      );
    } catch (error) {
      setPageStatus({ tone: "error", text: errorMessage(error, "Export failed") });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteSegment = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setConfirmDeleteId(null);
    try {
      await fetchJson<object>(`/api/segments?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      reloadWithFlash("Segment deleted.");
    } catch (error) {
      setInspectorStatus({ tone: "error", text: errorMessage(error, "Error deleting segment") });
    }
  };

  const selectSlot = (id: string) => {
    setSelectedSlotId(id);
    setConfirmDeleteId(null);
    setInspectorStatus(null);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const seekTo = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    videoRef.current.currentTime = seconds;
    videoRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  /** Moves the playhead from the timeline track without pausing playback. */
  const scrubTo = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = seconds;
    setCurrentTime(seconds);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * movie.durationSeconds;
  };

  const changePlaybackRate = (rate: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const stepFrame = (forward: boolean) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    videoRef.current.currentTime += forward ? FRAME_TIME : -FRAME_TIME;
  };

  if (!selectedMovie) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-xl items-center px-4 py-8">
        <div className="glass w-full rounded-3xl p-8 text-center">
          <p className="text-lg font-semibold text-white">Movie not found</p>
          <Link href="/director" className="mt-3 inline-block text-sm text-amber hover:underline">
            Back to Director Studio
          </Link>
        </div>
      </main>
    );
  }

  const timelinePercent = (seconds: number) => (seconds / movie.durationSeconds) * 100;
  const adSlotCount = slots.filter((slot) => slot.type === "ADSPOT_BILLBOARD").length;

  return (
    <MotionRoot>
      <main className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <Reveal className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <Link
              href="/director"
              className="mb-4 inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-amber/60"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Back to InScene Director Studio
            </Link>
            <p className="mb-2 text-xs font-semibold tracking-[0.3em] text-amber uppercase">Director Studio · Editor</p>
            <h1 className="truncate text-3xl font-bold text-white sm:text-4xl">{movie.title}</h1>
            <ul className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <li className="glass inline-flex items-center gap-1.5 rounded-full px-2.5 py-1">
                <Clock className="size-3.5" aria-hidden />
                {formatClock(movie.durationSeconds)}
              </li>
              <li className="glass inline-flex items-center gap-1.5 rounded-full px-2.5 py-1">
                <Layers className="size-3.5" aria-hidden />
                {slots.length} {slots.length === 1 ? "segment" : "segments"}
              </li>
              <li className="glass inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-amber">
                <Megaphone className="size-3.5" aria-hidden />
                {adSlotCount} ad {adSlotCount === 1 ? "slot" : "slots"}
              </li>
            </ul>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <SegmentDialog movieId={movie.id} currentTime={currentTime} />
            <Button onClick={handleExport} disabled={isExporting} className="h-10 px-4">
              {isExporting ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Scissors className="size-4" aria-hidden />}
              {isExporting ? "Exporting..." : "Export Fallback Segments"}
            </Button>
          </div>
        </Reveal>

        <StatusMessage status={pageStatus} onDismiss={isExporting ? undefined : () => setPageStatus(null)} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
          {/* Left column: stage, timeline & Slot Scout */}
          <div className="flex min-w-0 flex-col gap-6">
            <Reveal delay={0.05}>
              <VideoStage
                videoRef={videoRef}
                src={movie.canonicalVideoUrl}
                isPlaying={isPlaying}
                currentTime={currentTime}
                playbackRate={playbackRate}
                slots={slots}
                candidates={scoutCandidates}
                selectedSlotId={selectedSlotId}
                timelinePercent={timelinePercent}
                onTogglePlay={togglePlay}
                onStepFrame={stepFrame}
                onRateChange={changePlaybackRate}
                onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                onEnded={() => setIsPlaying(false)}
                onScrubClick={handleTimelineClick}
              />
            </Reveal>

            <Reveal delay={0.12}>
              <TimelineTrack
                duration={movie.durationSeconds}
                currentTime={currentTime}
                slots={slots}
                candidates={scoutCandidates}
                selectedSlotId={selectedSlotId}
                onSelectSlot={selectSlot}
                onScrub={scrubTo}
                onPreviewCandidate={seekTo}
              />
            </Reveal>

            <Reveal delay={0.18}>
              <SlotScoutPanel
                movieId={movie.id}
                candidates={scoutCandidates}
                onCandidatesChange={setScoutCandidates}
                onSeek={seekTo}
              />
            </Reveal>
          </div>

          {/* Right column: inspector */}
          <Reveal delay={0.1} className="min-w-0 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto lg:rounded-3xl">
            <aside aria-label="Segment inspector">
              {selectedSlot ? (
                <SegmentInspector
                  movieId={movie.id}
                  slot={selectedSlot}
                  profiles={seedProfiles}
                  status={inspectorStatus}
                  onDismissStatus={() => setInspectorStatus(null)}
                  isConfirmingDelete={confirmDeleteId === selectedSlot.id}
                  onCancelDelete={() => setConfirmDeleteId(null)}
                  onDelete={() => handleDeleteSegment(selectedSlot.id)}
                  selectedProfileId={selectedProfileId}
                  onProfileChange={setSelectedProfileId}
                  isRegenerating={isRegenerating}
                  onRegenerate={handleRegenerate}
                  variants={selectedVariants}
                  brandNames={brandNames}
                  onJobUpdated={handleJobUpdated}
                />
              ) : (
                <InspectorEmptyState />
              )}
            </aside>
          </Reveal>
        </div>
      </main>
    </MotionRoot>
  );
}
