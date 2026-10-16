import { NextRequest, NextResponse } from "next/server";
import { seedSlots } from "@/lib/data/seed";
import { cachedSceneProfile, ensureSceneProfile } from "@/lib/ads/campaign-store";

/** GET ?movieId → scene safety profiles for every ad slot. */
export async function GET(req: NextRequest) {
  const movieId = new URL(req.url).searchParams.get("movieId");
  const scenes = seedSlots
    .filter((slot) => slot.movieId === movieId && slot.type === "ADSPOT_BILLBOARD")
    .map((slot) => cachedSceneProfile(slot));
  return NextResponse.json({ success: true, scenes });
}

/** POST {slotId, force?} → run Gemini brand-safety analysis on the slot's clip. */
export async function POST(req: NextRequest) {
  try {
    const { slotId, force = false } = (await req.json()) as { slotId?: string; force?: boolean };
    const slot = seedSlots.find((candidate) => candidate.id === slotId);
    if (!slot) return NextResponse.json({ success: false, error: "Slot not found" }, { status: 404 });

    const scene = await ensureSceneProfile(slot, force);
    return NextResponse.json({ success: true, scene });
  } catch (error) {
    console.error("Scene analysis failed:", error);
    return NextResponse.json({ success: false, error: "Scene analysis failed" }, { status: 500 });
  }
}
