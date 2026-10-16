import { NextRequest, NextResponse } from "next/server";
import { seedProfiles } from "@/lib/data/seed";
import { allMovies, slotsForMovie } from "@/lib/data/studio-store";
import { GenerationQueue } from "@/lib/jobs/generation-queue";
import { cachedSceneProfile, decideForSlot, resolveNow } from "@/lib/ads/campaign-store";
import { policyForSlot } from "@/lib/ads/brand-safety";

/**
 * What every ad surface in a film shows for one viewer, why, and the rendered cut's
 * exposure / audio. Powers "Why this ad?", the shoppable pause card and audio ads.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const movie = allMovies().find((candidate) => candidate.id === url.searchParams.get("movieId"));
  const profile = seedProfiles.find((candidate) => candidate.id === url.searchParams.get("profileId"));

  if (!movie || !profile) {
    return NextResponse.json({ success: false, error: "Movie or profile not found" }, { status: 404 });
  }

  const now = resolveNow(url.searchParams.get("date"));
  const jobs = await GenerationQueue.getAllJobs();

  const slots = slotsForMovie(movie.id)
    .filter((slot) => slot.type === "ADSPOT_BILLBOARD" && slot.isEnabled)
    .map((slot) => {
      const decision = decideForSlot(slot, profile, now);
      const job = jobs
        .filter((candidate) => candidate.slotId === slot.id && candidate.profileId === profile.id && candidate.adKey === decision.adKey)
        .sort((left, right) => (right.createdAt ?? "").localeCompare(left.createdAt ?? ""))[0];

      return {
        slotId: slot.id,
        label: slot.label,
        startSeconds: slot.startSeconds,
        endSeconds: slot.endSeconds,
        policy: policyForSlot(slot),
        scene: cachedSceneProfile(slot),
        decision,
        cut: job
          ? { jobId: job.id, status: job.status, exposure: job.exposure, audioAssetUrl: job.audioAssetUrl, approved: job.approved }
          : null,
      };
    });

  return NextResponse.json({ success: true, date: now.toISOString().slice(0, 10), slots });
}
