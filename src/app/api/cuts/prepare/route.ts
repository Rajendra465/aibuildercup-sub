import { NextRequest, NextResponse } from "next/server";
import { GenerationQueue } from "@/lib/jobs/generation-queue";
import { buildPlaybackManifest } from "@/lib/playback/manifest";
import { allMovies, slotsForMovie } from "@/lib/data/studio-store";
import { seedProfiles } from "@/lib/data/seed";
import { decideForSlot, resolveNow } from "@/lib/ads/campaign-store";
import { policyForSlot } from "@/lib/ads/brand-safety";
import { AdaptiveSlot, GenerationJob, ViewerProfile } from "@/lib/types";
import fs from "fs";
import path from "path";

function publicAssetExists(assetUrl: string) {
  const relativePath = assetUrl.startsWith("/") ? assetUrl.slice(1) : assetUrl;
  return fs.existsSync(path.join(process.cwd(), "public", relativePath));
}

/**
 * For ad slots, only cuts rendered for the campaign that should run *now* may play
 * (seasonal re-versioning), and only approved cuts when the director requires approval.
 */
function playableAdJobs(jobs: GenerationJob[], slots: AdaptiveSlot[], profile: ViewerProfile, now: Date) {
  const adSlots = new Map(slots.filter((slot) => slot.type === "ADSPOT_BILLBOARD").map((slot) => [slot.id, slot]));
  const currentKeys = new Map([...adSlots.values()].map((slot) => [slot.id, decideForSlot(slot, profile, now).adKey]));

  return jobs.filter((job) => {
    const slot = adSlots.get(job.slotId);
    if (!slot) return true;
    if (job.adKey !== currentKeys.get(slot.id)) return false;
    return !policyForSlot(slot).requireApproval || job.approved;
  });
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const movieId = url.searchParams.get("movieId");
    const profileId = url.searchParams.get("profileId");
    const movie = allMovies().find((candidate) => candidate.id === movieId);

    if (!movie) {
      return NextResponse.json({ success: false, error: "Movie not found" }, { status: 404 });
    }

    const allJobs = await GenerationQueue.getAllJobs();
    const profile = seedProfiles.find((candidate) => candidate.id === profileId);
    const slots = slotsForMovie(movie.id);
    const profileJobs = profileId ? allJobs.filter((job) => job.movieId === movie.id && job.profileId === profileId) : [];
    const jobs = profile ? playableAdJobs(profileJobs, slots, profile, resolveNow(url.searchParams.get("date"))) : profileJobs;
    const manifest = buildPlaybackManifest({ movie, slots, jobs, assetExists: publicAssetExists });

    return NextResponse.json({ success: true, manifest });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
