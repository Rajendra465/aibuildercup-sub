import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

const CONTENT_TYPES: Record<string, string> = {
  ".mp4": "video/mp4", ".m4s": "video/iso.segment", ".webm": "video/webm", ".wav": "audio/wav",
  ".mp3": "audio/mpeg", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
};

/**
 * `next start` only serves files that were in /public at build time. Generated cuts, brand
 * uploads and audio ads appear at runtime, so /media/* falls through to this handler
 * (see the rewrite in next.config.ts). Supports Range requests for video seeking.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const mediaRoot = path.join(process.cwd(), "public", "media");
  const filePath = path.resolve(mediaRoot, ...segments);

  if (!filePath.startsWith(mediaRoot + path.sep) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return new Response("Not found", { status: 404 });
  }

  const size = fs.statSync(filePath).size;
  const contentType = CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
  const range = req.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);

  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    const stream = Readable.toWeb(fs.createReadStream(filePath, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(end - start + 1),
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
      },
    });
  }

  const stream = Readable.toWeb(fs.createReadStream(filePath)) as ReadableStream;
  return new Response(stream, {
    headers: { "Content-Type": contentType, "Content-Length": String(size), "Accept-Ranges": "bytes" },
  });
}
