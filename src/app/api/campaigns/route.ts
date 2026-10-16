import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { AdCategory, Campaign } from "@/lib/types";
import { deleteCampaign, listCampaigns, saveCampaign } from "@/lib/ads/campaign-store";

const CATEGORIES: AdCategory[] = [
  "food_beverage", "alcohol", "travel", "automotive", "finance", "tech", "retail",
  "entertainment", "telecom", "health", "gambling", "public_service",
];
const IMAGE_TYPES: Record<string, string> = { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp" };
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const list = (form: FormData, key: string) =>
  text(form, key).split(/[\n,]+/).map((entry) => entry.trim()).filter(Boolean);

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "campaign";
}

async function saveImage(file: FormDataEntryValue | null, campaignId: string, kind: "logo" | "product") {
  if (!(file instanceof File) || file.size === 0) return undefined;
  const extension = IMAGE_TYPES[file.type];
  if (!extension) throw new Error(`${kind} must be PNG, JPEG or WebP`);
  if (file.size > MAX_IMAGE_BYTES) throw new Error(`${kind} must be under 5 MB`);

  const dir = path.join(process.cwd(), "public", "media", "brands");
  fs.mkdirSync(dir, { recursive: true });
  const fileName = `${campaignId}-${kind}${extension}`;
  fs.writeFileSync(path.join(dir, fileName), Buffer.from(await file.arrayBuffer()));
  return `/media/brands/${fileName}`;
}

export async function GET() {
  return NextResponse.json({ success: true, campaigns: listCampaigns() });
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const brandName = text(form, "brandName");
    const productName = text(form, "productName");
    const tagline = text(form, "tagline");
    const landingUrl = text(form, "landingUrl");
    const category = text(form, "category") as AdCategory;
    const flightStart = text(form, "flightStart");
    const flightEnd = text(form, "flightEnd");

    if (!brandName || !productName || !tagline) {
      return NextResponse.json({ success: false, error: "Brand, product and tagline are required" }, { status: 400 });
    }
    if (!CATEGORIES.includes(category)) {
      return NextResponse.json({ success: false, error: "Pick a valid category" }, { status: 400 });
    }
    if (!/^https?:\/\//.test(landingUrl)) {
      return NextResponse.json({ success: false, error: "Landing URL must start with http:// or https://" }, { status: 400 });
    }
    if ((flightStart && !DATE.test(flightStart)) || (flightEnd && !DATE.test(flightEnd)) || (flightStart && flightEnd && flightEnd < flightStart)) {
      return NextResponse.json({ success: false, error: "Flight dates must be YYYY-MM-DD and end after they start" }, { status: 400 });
    }

    const id = `${slugify(brandName)}-${Date.now()}`;
    const campaign: Campaign = {
      id,
      brandName,
      productName,
      tagline,
      category,
      isPublicService: category === "public_service",
      logoUrl: await saveImage(form.get("logo"), id, "logo"),
      productImageUrl: await saveImage(form.get("productImage"), id, "product"),
      brandColors: list(form, "brandColors").filter((color) => /^#[0-9a-fA-F]{3,8}$/.test(color)).slice(0, 4),
      ctaLabel: text(form, "ctaLabel") || "Learn more",
      landingUrl,
      targetCities: list(form, "targetCities"),
      targetCountries: list(form, "targetCountries"),
      targetLocales: list(form, "targetLocales"),
      avoidContexts: list(form, "avoidContexts").map((entry) => entry.toLowerCase()),
      flightStart: flightStart || undefined,
      flightEnd: flightEnd || undefined,
      seasonLabel: text(form, "seasonLabel") || undefined,
      bidWeight: Math.min(10, Math.max(0, Number(text(form, "bidWeight")) || 1)),
      audioScript: text(form, "audioScript") || undefined,
      createdAt: new Date().toISOString(),
    };

    saveCampaign(campaign);
    return NextResponse.json({ success: true, campaign });
  } catch (error) {
    console.error("Failed to create campaign:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Could not save campaign" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
  const removed = deleteCampaign(id);
  return NextResponse.json({ success: removed, error: removed ? undefined : "Campaign not found" }, { status: removed ? 200 : 404 });
}
