import { NextRequest, NextResponse } from "next/server";
import { GenerationQueue } from "@/lib/jobs/generation-queue";

/** POST {jobId, approved} → director approves or rejects a rendered cut. */
export async function POST(req: NextRequest) {
  const { jobId, approved } = (await req.json()) as { jobId?: string; approved?: boolean };
  if (!jobId) return NextResponse.json({ success: false, error: "jobId is required" }, { status: 400 });

  const job = await GenerationQueue.updateJob(jobId, { approved: Boolean(approved) });
  if (!job) return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
  return NextResponse.json({ success: true, job });
}
