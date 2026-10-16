import { NextRequest, NextResponse } from "next/server";
import { AdCategory, SlotAdPolicy } from "@/lib/types";
import { seedSlots } from "@/lib/data/seed";
import { writeStudioSeedFile } from "@/lib/data/studio-store";
import { policyForSlot } from "@/lib/ads/brand-safety";

const CATEGORIES: AdCategory[] = [
  "food_beverage", "alcohol", "travel", "automotive", "finance", "tech", "retail",
  "entertainment", "telecom", "health", "gambling", "public_service",
];

/** PUT {slotId, blockedCategories, maxProminence, requireApproval} → director's ad rules for a slot. */
export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<SlotAdPolicy> & { slotId?: string };
    const slot = seedSlots.find((candidate) => candidate.id === body.slotId);
    if (!slot) return NextResponse.json({ success: false, error: "Slot not found" }, { status: 404 });

    const maxProminence = Number(body.maxProminence);
    if (!Number.isFinite(maxProminence) || maxProminence < 0.05 || maxProminence > 0.8) {
      return NextResponse.json({ success: false, error: "maxProminence must be between 0.05 and 0.8" }, { status: 400 });
    }

    const adPolicy: SlotAdPolicy = {
      ...policyForSlot(slot),
      blockedCategories: (body.blockedCategories ?? []).filter((category) => CATEGORIES.includes(category)),
      maxProminence,
      requireApproval: Boolean(body.requireApproval),
    };

    const updated = { ...slot, adPolicy, visualConstraints: { ...slot.visualConstraints, maxProminence } };
    writeStudioSeedFile({ slots: seedSlots.map((candidate) => (candidate.id === slot.id ? updated : candidate)) });
    return NextResponse.json({ success: true, slot: updated });
  } catch (error) {
    console.error("Failed to update ad policy:", error);
    return NextResponse.json({ success: false, error: "Could not update ad policy" }, { status: 500 });
  }
}
