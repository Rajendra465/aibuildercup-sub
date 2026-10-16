import { AdaptiveSlot, Campaign, ExposureReport } from "@/lib/types";
import { ANALYSIS_MODEL, extractJson, getGenAI, uploadVideoForAnalysis } from "@/lib/ai/genai-client";
import { policyForSlot } from "./brand-safety";

/** Frame share at which size stops adding to the score. */
const FULL_SIZE_SHARE = 0.25;

export interface ExposureMeasurement {
  frameShare: number;
  visibleSeconds: number;
  slotSeconds: number;
  legibility: number;
  notes?: string;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

export function scoreExposure(
  measurement: ExposureMeasurement,
  maxProminence: number,
  source: ExposureReport["source"],
): ExposureReport {
  const slotSeconds = Math.max(0.001, measurement.slotSeconds);
  const frameShare = clamp01(measurement.frameShare);
  const visibleSeconds = Math.min(slotSeconds, Math.max(0, measurement.visibleSeconds));
  const legibility = clamp01(measurement.legibility);

  const score = Math.round(
    100 *
      (0.4 * Math.min(frameShare / FULL_SIZE_SHARE, 1) +
        0.35 * (visibleSeconds / slotSeconds) +
        0.25 * legibility),
  );

  return {
    frameShare,
    visibleSeconds: Number(visibleSeconds.toFixed(2)),
    slotSeconds: Number(slotSeconds.toFixed(2)),
    legibility,
    score,
    withinProminenceCap: frameShare <= maxProminence,
    notes: measurement.notes ?? "",
    source,
  };
}

function estimateExposure(slot: AdaptiveSlot): ExposureReport {
  const policy = policyForSlot(slot);
  const slotSeconds = slot.endSeconds - slot.startSeconds;
  return scoreExposure(
    {
      frameShare: Math.min(0.2, policy.maxProminence),
      visibleSeconds: slotSeconds * 0.8,
      slotSeconds,
      legibility: 0.7,
      notes: "Estimated: no Gemini credentials configured",
    },
    policy.maxProminence,
    "estimate",
  );
}

/** Ask Gemini to watch the rendered cut and measure how visible the ad is. */
export async function measureExposure(
  slot: AdaptiveSlot,
  videoPath: string,
  campaign: Campaign | undefined,
): Promise<ExposureReport> {
  const ai = getGenAI();
  if (!ai || !process.env.GEMINI_API_KEY) return estimateExposure(slot);

  const policy = policyForSlot(slot);
  const slotSeconds = slot.endSeconds - slot.startSeconds;

  try {
    const video = await uploadVideoForAnalysis(ai, videoPath, `exposure-${slot.id}`);
    const brand = campaign ? `the ${campaign.brandName} advertisement` : "the billboard / ad surface";
    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { fileData: { fileUri: video.uri, mimeType: video.mimeType } },
            {
              text: `Measure the on-screen exposure of ${brand} in this ${slotSeconds.toFixed(1)}s clip.
Return ONLY JSON: {"frameShare": number 0-1 (average fraction of the frame the ad covers while visible),
"visibleSeconds": number (seconds the ad is visible), "legibility": number 0-1 (how readable the brand and copy are),
"notes": string (one sentence)}.`,
            },
          ],
        },
      ],
      config: { responseMimeType: "application/json" },
    });

    const raw = extractJson(response.text ?? "") as Partial<ExposureMeasurement>;
    return scoreExposure(
      {
        frameShare: Number(raw.frameShare),
        visibleSeconds: Number(raw.visibleSeconds),
        slotSeconds,
        legibility: Number(raw.legibility),
        notes: typeof raw.notes === "string" ? raw.notes : "",
      },
      policy.maxProminence,
      "gemini",
    );
  } catch (error) {
    console.error(`Exposure measurement failed for ${slot.id}; using estimate`, error);
    return estimateExposure(slot);
  }
}
