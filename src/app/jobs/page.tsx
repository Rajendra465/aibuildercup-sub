import type { Metadata } from "next";
import Link from "next/link";
import { GenerationQueue } from "@/lib/jobs/generation-queue";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Force dynamic rendering so jobs are always fresh when reloading the page
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: "Render Jobs" };

function describeAdKey(adKey: string): string {
  if (adKey === "neutral") return "Neutral art (ad-free)";
  if (adKey === "none") return "No placement";
  if (adKey.startsWith("psa:")) return `Public service · ${adKey.slice(4)}`;
  return `Campaign · ${adKey}`;
}

export default async function JobsPage() {
  const jobs = await GenerationQueue.getAllJobs();

  return (
    <main className="min-h-screen p-8 max-w-5xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link href="/" className="text-[#F2A541] hover:text-[#f6bd70] text-sm mb-2 inline-block">
            &larr; Back to InScene
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Render Jobs</h1>
          <p className="text-slate-400 mt-1">Monitor in-scene renders: scene edits, brand placements and their validation.</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-zinc-900 border-zinc-700">
            Total Jobs: {jobs.length}
          </Badge>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {jobs.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-zinc-800 rounded-xl text-slate-500">
            No jobs in the queue.
          </div>
        ) : (
          jobs.map(job => (
            <Card key={job.id} className="bg-zinc-900 border-zinc-800">
              <CardHeader className="py-4">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Job: {job.id}</span>
                  <Badge className={
                    job.status === 'READY' ? 'bg-green-600' :
                    job.status === 'FAILED' ? 'bg-red-600' :
                    'bg-amber-600'
                  }>
                    {job.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-300 flex flex-col gap-2">
                <div className="flex gap-4">
                  <span className="w-24 text-slate-500">Slot ID:</span>
                  <span className="font-mono">{job.slotId}</span>
                </div>
                <div className="flex gap-4">
                  <span className="w-24 text-slate-500">Profile:</span>
                  <span className="font-mono">{job.profileId}</span>
                </div>
                {job.adKey && (
                  <div className="flex gap-4">
                    <span className="w-24 text-slate-500">Placement:</span>
                    <span className="font-mono">{describeAdKey(job.adKey)}</span>
                  </div>
                )}
                {job.exposure && (
                  <div className="flex gap-4">
                    <span className="w-24 shrink-0 text-slate-500">Exposure:</span>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-semibold text-[#F2A541]">{Math.round(job.exposure.score)}/100</span>
                      <span>{Math.round(job.exposure.frameShare * 100)}% of frame</span>
                      <span>{job.exposure.visibleSeconds.toFixed(1)}s / {job.exposure.slotSeconds.toFixed(1)}s visible</span>
                      <span>legibility {Math.round(job.exposure.legibility * 100)}%</span>
                      <Badge variant="outline" className={job.exposure.withinProminenceCap ? "border-emerald-600 text-emerald-300" : "border-red-600 text-red-300"}>
                        {job.exposure.withinProminenceCap ? "Within prominence cap" : "Over prominence cap"}
                      </Badge>
                      <span className="text-xs text-slate-500">({job.exposure.source})</span>
                    </span>
                  </div>
                )}
                <div className="flex gap-4">
                  <span className="w-24 text-slate-500">Cache Key:</span>
                  <span className="font-mono text-xs break-all">{job.cacheKey}</span>
                </div>
                {job.videoPrompt && (
                  <div className="mt-4 p-4 bg-zinc-950 rounded-lg border border-zinc-800/80 flex flex-col gap-2 shadow-inner">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#F2A541] shadow-[0_0_8px_#F2A541]" />
                      <span className="text-[#F2A541] font-semibold text-xs uppercase tracking-wider">Gemini Omni scene-edit prompt</span>
                    </div>
                    <p className="text-amber-50/90 text-xs whitespace-pre-wrap leading-relaxed italic border-l-2 border-[#F2A541]/50 pl-3">
                      &quot;{job.videoPrompt}&quot;
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
