import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { AdaptiveSlot } from "@/lib/types";
import { seedSlots } from "@/lib/data/seed";
import { allMovies, publicMediaPathFromUrl, writeStudioSeedFile } from "@/lib/data/studio-store";
import { listScoutCandidates, saveScoutCandidates } from "@/lib/ads/campaign-store";
import { scoutMovie } from "@/lib/ads/slot-scout";
import { DEFAULT_AD_POLICY } from "@/lib/ads/brand-safety";

/** GET ?movieId → last scout results. */
export async function GET(req: NextRequest) {
  const movieId = new URL(req.url).searchParams.get("movieId") ?? "";
  return NextResponse.json({ success: true, candidates: listScoutCandidates(movieId) });
}

/**
 * POST {movieId} → Gemini watches the film and proposes ad surfaces.
 * POST {movieId, acceptCandidateId} → turns a candidate into an ADSPOT_BILLBOARD slot.
 */
export async function POST(req: NextRequest) {
  try {
    const { movieId, acceptCandidateId } = (await req.json()) as { movieId?: string; acceptCandidateId?: string };
    const movie = allMovies().find((candidate) => candidate.id === movieId);
    if (!movie) return NextResponse.json({ success: false, error: "Movie not found" }, { status: 404 });

    if (acceptCandidateId) {
      const candidate = listScoutCandidates(movie.id).find((entry) => entry.id === acceptCandidateId);
      if (!candidate) return NextResponse.json({ success: false, error: "Candidate not found" }, { status: 404 });

      const slotId = `slot-scout-${Date.now()}`;
      const slot: AdaptiveSlot = {
        id: slotId,
        movieId: movie.id,
        label: `Ad: ${candidate.surfaceType} @ ${candidate.startSeconds.toFixed(1)}s`,
        type: "ADSPOT_BILLBOARD",
        startSeconds: candidate.startSeconds,
        endSeconds: candidate.endSeconds,
        generationLeadSeconds: 30,
        generationDeadlineSeconds: 5,
        narrativePurpose: candidate.description,
        editableFields: candidate.editableFields,
        immutableFacts: candidate.immutableFacts,
        prohibitedChanges: [],
        visualConstraints: {
          preserveDuration: true,
          preserveCameraMotion: true,
          preserveLighting: true,
          preserveCharacters: true,
          preserveForegroundObjects: true,
          maxProminence: candidate.suggestedMaxProminence,
        },
        adPolicy: { ...DEFAULT_AD_POLICY, maxProminence: candidate.suggestedMaxProminence },
        supportedLocales: [],
        canonicalFallbackUrl: `/media/fallbacks/${slotId}-generic.mp4`,
        generationStrategy: "VIDEO_EDIT",
        isEnabled: true,
      };

      writeStudioSeedFile({ slots: [slot, ...seedSlots] });
      saveScoutCandidates(movie.id, listScoutCandidates(movie.id).filter((entry) => entry.id !== candidate.id));
      return NextResponse.json({ success: true, slot });
    }

    const videoPath = publicMediaPathFromUrl(movie.canonicalVideoUrl);
    if (!fs.existsSync(videoPath)) {
      return NextResponse.json({ success: false, error: "Canonical video file is missing" }, { status: 400 });
    }

    const candidates = await scoutMovie(movie, videoPath);
    saveScoutCandidates(movie.id, candidates);
    return NextResponse.json({ success: true, candidates });
  } catch (error) {
    console.error("Slot Scout failed:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Slot Scout failed" }, { status: 500 });
  }
}
