import { NextRequest, NextResponse } from "next/server";
import { seedSlots, seedProfiles } from "@/lib/data/seed";
import { allMovies, slotsForMovie } from "@/lib/data/studio-store";
import { GenerationQueue } from "@/lib/jobs/generation-queue";
import { VideoGenerationService } from "@/lib/ai/video-generation.service";
import { GenerationJob } from "@/lib/types";
import { exportPlaybackFragmentForAsset } from "@/lib/playback/fragment-export";
import { AdDecision } from "@/lib/types";
import { decideForSlot, ensureSceneProfile, resolveNow } from "@/lib/ads/campaign-store";
import { measureExposure } from "@/lib/ads/exposure";
import { generateAudioAd } from "@/lib/ads/audio-ad";
import { policyForSlot } from "@/lib/ads/brand-safety";
import { publicMediaPathFromUrl } from "@/lib/data/studio-store";
import fs from "fs";
import path from "path";

// Async function to run generation process in the background
const processJob = async (job: GenerationJob, now: Date) => {
  const slot = seedSlots.find(s => s.movieId === job.movieId && s.id === job.slotId);
  const profile = job.profileSnapshot;

  if (!slot || !profile) {
    await GenerationQueue.updateJob(job.id, { status: "FAILED", failureReason: "Slot or Profile not found" });
    return;
  }

  // Campaigns can change between enqueue and render; never render a different brand than the job was keyed for.
  let decision: AdDecision | undefined;
  if (slot.type === "ADSPOT_BILLBOARD") {
    decision = decideForSlot(slot, profile, now);
    if (decision.adKey !== job.adKey) {
      await GenerationQueue.updateJob(job.id, {
        status: "CANCELLED",
        failureReason: `Campaigns changed; the pick is now ${decision.campaign?.brandName ?? decision.kind}; re-queue to render it.`,
      });
      return;
    }
  }

  // Check if file is already on disk as a failsafe
  const fileName = `${job.id}.mp4`;
  const filePath = path.join(process.cwd(), 'public', 'media', 'generated', fileName);
  if (fs.existsSync(filePath)) {
    console.log(`Job ${job.id} already has generated video on disk. Bypassing API generation.`);
    const videoAssetUrl = `/media/generated/${fileName}`;
    await exportPlaybackFragmentForAsset(videoAssetUrl);
    await GenerationQueue.updateJob(job.id, { 
      status: "READY", 
      videoAssetUrl,
      completedAt: new Date().toISOString()
    });
    return;
  }

  try {
    // Generate Video directly with Omni (image generation bypassed as requested)
    await GenerationQueue.updateJob(job.id, { status: "GENERATING_VIDEO" });
    const audioPromise = decision?.campaign ? generateAudioAd(decision.campaign, profile) : Promise.resolve(undefined);
    const videoUrl = await VideoGenerationService.generateVideoInsert(slot, profile, job.id, decision);
    await exportPlaybackFragmentForAsset(videoUrl);

    if (!decision || decision.kind === "NONE") {
      await GenerationQueue.updateJob(job.id, { status: "READY", videoAssetUrl: videoUrl, completedAt: new Date().toISOString() });
      return;
    }

    // Ad cuts: measure exposure and enforce the director's prominence cap before anyone sees it.
    await GenerationQueue.updateJob(job.id, { status: "VALIDATING", videoAssetUrl: videoUrl });
    const isGenerated = videoUrl !== slot.canonicalFallbackUrl;
    const exposure = isGenerated
      ? await measureExposure(slot, publicMediaPathFromUrl(videoUrl), decision.campaign)
      : undefined;
    const audioAssetUrl = await audioPromise;
    const overCap = exposure && !exposure.withinProminenceCap;

    await GenerationQueue.updateJob(job.id, {
      status: overCap ? "FAILED" : "READY",
      exposure,
      audioAssetUrl,
      failureReason: overCap
        ? `Ad covers ${Math.round(exposure.frameShare * 100)}% of the frame, over the director's ${Math.round(policyForSlot(slot).maxProminence * 100)}% cap. Original segment will play.`
        : undefined,
      completedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);
    await GenerationQueue.updateJob(job.id, { status: "FAILED", failureReason: String(error) });
  }
};

export async function POST(req: NextRequest) {
  try {
    const { movieId, profileId, slotId, force = false, date } = await req.json();
    const now = resolveNow(typeof date === "string" ? date : undefined);

    const profile = seedProfiles.find(p => p.id === profileId);
    if (!profile) {
      return NextResponse.json({ success: false, error: "Profile not found" }, { status: 400 });
    }

    const movie = allMovies().find((candidate) => candidate.id === movieId);
    if (!movie) {
      return NextResponse.json({ success: false, error: "Movie not found" }, { status: 400 });
    }

    const movieSlots = slotsForMovie(movie.id);
    const requestedSlots = slotId ? movieSlots.filter((slot) => slot.id === slotId) : movieSlots;
    if (slotId && requestedSlots.length === 0) {
      return NextResponse.json({ success: false, error: "Segment not found" }, { status: 400 });
    }

    const enqueuedJobs: GenerationJob[] = [];

    // Queue up jobs for all adaptive slots
    for (const slot of requestedSlots) {
      // Ad cuts are cached per campaign: when a new season's campaign starts, a new cut renders
      // and the old one stays on disk for when it comes back.
      // Scene analysis runs once per slot (cached), so brand safety sees Gemini's read of the scene.
      if (slot.type === "ADSPOT_BILLBOARD") await ensureSceneProfile(slot);
      const adKey = slot.type === "ADSPOT_BILLBOARD" ? decideForSlot(slot, profile, now).adKey : undefined;
      const baseJobId = `job-${movieId}-${slot.id}-${profileId}${adKey ? `-${adKey}` : ""}`;
      const jobId = force ? `${baseJobId}-v${Date.now()}` : baseJobId;
      let job = await GenerationQueue.getJob(jobId);

      // Check if file is already generated and stored in /generated directory
      const fileName = `${jobId}.mp4`;
      const filePath = path.join(process.cwd(), 'public', 'media', 'generated', fileName);
      const fileExists = fs.existsSync(filePath);

      if (fileExists) {
        const videoAssetUrl = `/media/generated/${fileName}`;
        await exportPlaybackFragmentForAsset(videoAssetUrl);
        // If file exists, ensure there is a READY job associated with it
        if (!job || job.status !== "READY") {
          job = {
            id: jobId,
            movieId,
            slotId: slot.id,
            profileId,
            profileSnapshot: profile,
            adKey,
            status: "READY",
            videoAssetUrl,
            cacheKey: `${slot.id}-${profile.locale}-${profile.city}`,
            approved: false,
            startedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString()
          };
          await GenerationQueue.enqueue(job);
        }
      } else if (!job) {
        // Enqueue background processing if not exists
        job = {
          id: jobId,
          movieId,
          slotId: slot.id,
          profileId,
          profileSnapshot: profile,
          adKey,
          status: "QUEUED",
          cacheKey: `${slot.id}-${profile.locale}-${profile.city}`,
          approved: false,
          startedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };
        await GenerationQueue.enqueue(job);
        
        // Fire and forget the background process
        processJob(job, now);
      }
      
      enqueuedJobs.push(job);
    }

    return NextResponse.json({ success: true, jobs: enqueuedJobs });
  } catch (error) {
    console.error("Failed to enqueue jobs:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
