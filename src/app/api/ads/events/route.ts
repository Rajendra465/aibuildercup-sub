import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { AdEventType } from "@/lib/types";
import { seedProfiles } from "@/lib/data/seed";
import { listCampaigns, listEvents, recordEvent } from "@/lib/ads/campaign-store";
import { summarizeEvents } from "@/lib/ads/analytics";

const EVENT_TYPES: AdEventType[] = ["IMPRESSION", "PAUSE_VIEW", "CLICK", "AUDIO_PLAY"];

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const type = body.type as AdEventType;
    const campaignId = String(body.campaignId ?? "");
    const profile = seedProfiles.find((candidate) => candidate.id === body.profileId);

    if (!EVENT_TYPES.includes(type) || !campaignId || !profile) {
      return NextResponse.json({ success: false, error: "type, campaignId and a known profileId are required" }, { status: 400 });
    }

    const exposureScore = Number(body.exposureScore);
    recordEvent({
      id: randomUUID(),
      type,
      campaignId,
      movieId: String(body.movieId ?? ""),
      slotId: String(body.slotId ?? ""),
      profileId: profile.id,
      city: profile.city,
      locale: profile.locale,
      exposureScore: Number.isFinite(exposureScore) ? exposureScore : undefined,
      at: new Date().toISOString(),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to record ad event:", error);
    return NextResponse.json({ success: false, error: "Could not record event" }, { status: 500 });
  }
}

/** Advertiser dashboard summary. */
export async function GET() {
  const campaigns = listCampaigns();
  return NextResponse.json({ success: true, summary: summarizeEvents(listEvents(), campaigns), campaigns });
}
