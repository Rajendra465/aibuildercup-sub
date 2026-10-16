import { GoogleGenAI } from "@google/genai";

export const ANALYSIS_MODEL = process.env.INSCENE_ANALYSIS_MODEL || "gemini-3.5-flash";
export const TTS_MODEL = process.env.INSCENE_TTS_MODEL || "gemini-2.5-flash-preview-tts";

/**
 * Returns a Gemini client, or null when no credentials are configured so callers
 * can fall back to deterministic heuristics.
 *
 * - GEMINI_API_KEY → Gemini Developer API (required for file upload + Omni edits)
 * - GOOGLE_GENAI_USE_VERTEXAI=true + GOOGLE_CLOUD_PROJECT/LOCATION → Vertex AI
 */
export function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) return new GoogleGenAI({ apiKey });

  if (process.env.GOOGLE_GENAI_USE_VERTEXAI === "true" && process.env.GOOGLE_CLOUD_PROJECT) {
    return new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT,
      location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
    });
  }

  return null;
}

/** Gemini File API upload + poll until ACTIVE. Developer API only. */
export async function uploadVideoForAnalysis(ai: GoogleGenAI, localPath: string, displayName: string) {
  const uploaded = await ai.files.upload({ file: localPath, config: { mimeType: "video/mp4", displayName } });
  if (!uploaded.name) throw new Error("Upload did not return a file name");

  let file = uploaded;
  for (let attempt = 0; attempt < 24 && file.state !== "ACTIVE"; attempt++) {
    if (file.state === "FAILED") throw new Error(`Gemini could not process ${displayName}`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    file = await ai.files.get({ name: uploaded.name });
  }

  if (file.state !== "ACTIVE" || !file.uri) {
    throw new Error(`Video ${displayName} never became ACTIVE (state: ${file.state})`);
  }
  return { uri: file.uri, mimeType: file.mimeType || "video/mp4" };
}

/** Pull the first JSON object/array out of a model response. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.search(/[[{]/);
  if (start === -1) throw new Error("No JSON found in model response");
  return JSON.parse(candidate.slice(start));
}
