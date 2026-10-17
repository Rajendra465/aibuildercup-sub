// Cuts canonical gap clips, per-slot fallback clips and playback fragments for every seeded movie,
// exactly like the Director Studio "Export Fallback Segments" action, without a running Next server.
// Usage: node --experimental-strip-types scripts/export-segments.mts [movieId ...]
import { exec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import util from "node:util";
import type { AdaptiveSlot, Movie } from "../src/lib/types/index.ts";
import { buildCanonicalGapClips, orderedEnabledSlots } from "../src/lib/playback/clips.ts";
import { exportPlaybackFragmentForAsset } from "../src/lib/playback/fragment-export.ts";

const run = util.promisify(exec);
const seedText = fs.readFileSync(path.join("src", "lib", "data", "seed.ts"), "utf8").replace(/\r\n/g, "\n");

function readExport<T>(name: string, nextName?: string): T {
  const start = seedText.indexOf("= ", seedText.indexOf(`export const ${name}`)) + 2;
  const end = nextName ? seedText.indexOf(`export const ${nextName}`) : seedText.length;
  return JSON.parse(seedText.slice(start, end).trim().replace(/;$/, "")) as T;
}

const movies = readExport<Movie[]>("seedMovies", "seedSlots");
const slots = readExport<AdaptiveSlot[]>("seedSlots");
const only = process.argv.slice(2);

function publicPath(url: string) {
  return path.join("public", url.startsWith("/") ? url.slice(1) : url);
}

async function cut(input: string, start: number, duration: number, output: string) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  await run(`ffmpeg -y -v error -ss ${start} -i "${input}" -t ${duration} -c:v libx264 -preset fast -crf 23 -c:a aac -movflags +faststart "${output}"`);
}

for (const movie of movies) {
  if (only.length && !only.includes(movie.id)) continue;
  const input = publicPath(movie.canonicalVideoUrl);
  if (!fs.existsSync(input)) throw new Error(`Missing canonical video for ${movie.id}: ${input}`);
  const movieSlots = slots.filter((slot) => slot.movieId === movie.id);

  for (const gap of buildCanonicalGapClips(movie, movieSlots)) {
    await cut(input, gap.startSeconds, gap.endSeconds - gap.startSeconds, publicPath(gap.url));
    await exportPlaybackFragmentForAsset(gap.url);
    console.log(`gap   ${gap.id} ${gap.startSeconds}-${gap.endSeconds}s`);
  }
  for (const slot of orderedEnabledSlots(movie, movieSlots)) {
    await cut(input, slot.startSeconds, slot.endSeconds - slot.startSeconds, publicPath(slot.canonicalFallbackUrl));
    await exportPlaybackFragmentForAsset(slot.canonicalFallbackUrl);
    console.log(`slot  ${slot.id} ${slot.startSeconds}-${slot.endSeconds}s`);
  }
}
