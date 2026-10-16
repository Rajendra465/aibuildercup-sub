import { Movie, ScoutCandidate } from "@/lib/types";
import { ANALYSIS_MODEL, extractJson, getGenAI, uploadVideoForAnalysis } from "@/lib/ai/genai-client";

const SURFACE_TYPES: ScoutCandidate["surfaceType"][] = [
  "billboard", "screen", "storefront", "vehicle", "product", "poster", "other",
];
const MIN_SLOT_SECONDS = 1;
const MAX_CANDIDATES = 8;

const asStringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim() !== "") : [];

/** Validate and clamp whatever the model returned. Invalid entries are dropped. */
export function parseScoutCandidates(raw: unknown, movie: Pick<Movie, "id" | "durationSeconds">): ScoutCandidate[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { candidates?: unknown }).candidates)
      ? (raw as { candidates: unknown[] }).candidates
      : [];

  const parsed = list.flatMap((entry, index): ScoutCandidate[] => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;

    const start = Math.max(0, Number(item.startSeconds));
    const end = Math.min(movie.durationSeconds, Number(item.endSeconds));
    if (!Number.isFinite(start) || !Number.isFinite(end) || end - start < MIN_SLOT_SECONDS) return [];

    const surfaceType = SURFACE_TYPES.includes(item.surfaceType as ScoutCandidate["surfaceType"])
      ? (item.surfaceType as ScoutCandidate["surfaceType"])
      : "other";
    const description = typeof item.description === "string" ? item.description.trim() : "";
    if (!description) return [];

    const score = Math.round(Math.min(100, Math.max(0, Number(item.placementScore) || 0)));
    const maxProminence = Math.min(0.6, Math.max(0.05, Number(item.suggestedMaxProminence) || 0.3));

    return [{
      id: `scout-${movie.id}-${index}`,
      movieId: movie.id,
      startSeconds: Number(start.toFixed(3)),
      endSeconds: Number(end.toFixed(3)),
      surfaceType,
      description,
      placementScore: score,
      editableFields: asStringList(item.editableFields).length ? asStringList(item.editableFields) : [`the ${surfaceType}`],
      immutableFacts: asStringList(item.immutableFacts).length
        ? asStringList(item.immutableFacts)
        : ["camera motion", "actors", "lighting", "timing"],
      suggestedMaxProminence: Number(maxProminence.toFixed(2)),
      source: "gemini",
    }];
  });

  return parsed.sort((left, right) => right.placementScore - left.placementScore).slice(0, MAX_CANDIDATES);
}

/** Without Gemini we can't see the film, so offer evenly spaced windows flagged for manual review. */
export function heuristicCandidates(movie: Pick<Movie, "id" | "durationSeconds">): ScoutCandidate[] {
  const windowSeconds = Math.min(4, movie.durationSeconds / 3);
  if (windowSeconds < MIN_SLOT_SECONDS) return [];

  return [0.15, 0.5, 0.8].map((position, index) => {
    const start = Math.max(0, Math.min(movie.durationSeconds - windowSeconds, movie.durationSeconds * position));
    return {
      id: `scout-${movie.id}-h${index}`,
      movieId: movie.id,
      startSeconds: Number(start.toFixed(3)),
      endSeconds: Number((start + windowSeconds).toFixed(3)),
      surfaceType: "other" as const,
      description: "Possible background surface. Gemini is not configured, so check this window by eye.",
      placementScore: 20,
      editableFields: ["background signage"],
      immutableFacts: ["camera motion", "actors", "lighting", "timing"],
      suggestedMaxProminence: 0.3,
      source: "heuristic" as const,
    };
  });
}

const SCOUT_PROMPT = (durationSeconds: number) => `You are a product-placement scout for film. Watch this ${durationSeconds.toFixed(1)}s video and find surfaces
where an advertisement could be composited in without changing the story: billboards, TV or phone screens, shop signs,
posters, vehicles, cups or packaging.

For each surface return when it is clearly visible and stable. Prefer shots with little motion blur and no actor occluding it.
Return ONLY JSON: {"candidates": [{"startSeconds": number, "endSeconds": number,
"surfaceType": "billboard"|"screen"|"storefront"|"vehicle"|"product"|"poster"|"other",
"description": string (what and where in frame), "placementScore": 0-100 (visibility, stability, size, story-safety),
"editableFields": string[] (what may change), "immutableFacts": string[] (what must stay),
"suggestedMaxProminence": 0-1 (max share of the frame the ad should take)}]}.
Return at most ${MAX_CANDIDATES} candidates. Return {"candidates": []} if none.`;

export async function scoutMovie(movie: Movie, videoPath: string): Promise<ScoutCandidate[]> {
  const ai = getGenAI();
  if (!ai || !process.env.GEMINI_API_KEY) return heuristicCandidates(movie);

  const video = await uploadVideoForAnalysis(ai, videoPath, `scout-${movie.id}`);
  const response = await ai.models.generateContent({
    model: ANALYSIS_MODEL,
    contents: [
      {
        role: "user",
        parts: [{ fileData: { fileUri: video.uri, mimeType: video.mimeType } }, { text: SCOUT_PROMPT(movie.durationSeconds) }],
      },
    ],
    config: { responseMimeType: "application/json" },
  });

  return parseScoutCandidates(extractJson(response.text ?? ""), movie);
}
