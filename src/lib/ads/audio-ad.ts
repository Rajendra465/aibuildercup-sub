import fs from "fs";
import path from "path";
import { Campaign, ViewerProfile } from "@/lib/types";
import { TTS_MODEL, getGenAI } from "@/lib/ai/genai-client";

const TTS_SAMPLE_RATE = 24000;

export function buildAudioScript(campaign: Campaign, profile: ViewerProfile): { line: string; direction: string } {
  const line = campaign.audioScript?.trim() || `${campaign.brandName}. ${campaign.productName}. ${campaign.tagline}`;
  const direction =
    `Translate this into natural ${profile.languageLabel} (${profile.locale}) for listeners in ${profile.city}, ` +
    `then say it like a short shop-radio announcement heard in the background of a street: warm, casual, under 8 seconds.`;
  return { line, direction };
}

/** Wrap 16-bit mono PCM in a WAV header so browsers can play it. */
export function pcmToWav(pcm: Buffer, sampleRate = TTS_SAMPLE_RATE): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/** Generates a localized diegetic audio ad with Gemini TTS. Returns its public URL, or undefined. */
export async function generateAudioAd(campaign: Campaign, profile: ViewerProfile): Promise<string | undefined> {
  const ai = getGenAI();
  if (!ai) return undefined;

  const fileName = `${campaign.id}-${profile.locale}`.replace(/[^a-zA-Z0-9-]/g, "-") + ".wav";
  const outputDir = path.join(process.cwd(), "public", "media", "audio");
  const outputPath = path.join(outputDir, fileName);
  const publicUrl = `/media/audio/${fileName}`;
  if (fs.existsSync(outputPath)) return publicUrl;

  try {
    const { line, direction } = buildAudioScript(campaign, profile);
    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: [{ role: "user", parts: [{ text: `${direction}\n\nAnnouncement: "${line}"` }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
      },
    });

    const audioBase64 = response.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data)?.inlineData?.data;
    if (!audioBase64) throw new Error("TTS returned no audio");

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputPath, pcmToWav(Buffer.from(audioBase64, "base64")));
    return publicUrl;
  } catch (error) {
    console.error(`Audio ad generation failed for ${campaign.id}`, error);
    return undefined;
  }
}
