import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { GenerationJob } from "@/lib/types";
import { GenerationQueue } from "@/lib/jobs/generation-queue";
import { PageHeader } from "@/components/fx/motion";
import { JobList, type JobView } from "./job-list";

// Force dynamic rendering so jobs are always fresh when reloading the page
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: "Render Jobs" };

function describeAdKey(adKey: string): string {
  if (adKey === "neutral") return "Neutral art (ad-free)";
  if (adKey === "none") return "No placement";
  if (adKey.startsWith("psa:")) return `Public service · ${adKey.slice(4)}`;
  return `Campaign · ${adKey}`;
}

/** Only ship the fields the page renders to the client list. */
function toView(job: GenerationJob): JobView {
  return {
    id: job.id,
    status: job.status,
    slotId: job.slotId,
    profileId: job.profileId,
    placement: job.adKey ? describeAdKey(job.adKey) : undefined,
    exposure: job.exposure,
    cacheKey: job.cacheKey,
    videoPrompt: job.videoPrompt,
    failureReason: job.failureReason,
  };
}

function Counter({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <span className="glass inline-flex h-10 items-center gap-2 rounded-full px-4 text-xs text-slate-300">
      <span className={`size-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {label}: <span className="font-semibold text-white tabular-nums">{value}</span>
    </span>
  );
}

export default async function JobsPage() {
  const jobs = await GenerationQueue.getAllJobs();
  const ready = jobs.filter((job) => job.status === "READY").length;
  const failed = jobs.filter((job) => job.status === "FAILED").length;

  return (
    <main className="relative mx-auto min-h-screen max-w-5xl px-4 pt-10 pb-24 sm:px-6">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 rounded-md text-sm text-amber outline-none hover:text-[#f6bd70] focus-visible:ring-2 focus-visible:ring-amber/60"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to InScene
      </Link>
      <PageHeader
        kicker="Render pipeline"
        title="Render Jobs"
        lede="Monitor in-scene renders: scene edits, brand placements and their validation."
        actions={
          <>
            <Counter label="Total Jobs" value={jobs.length} dot="bg-white/60" />
            <Counter label="Ready" value={ready} dot="bg-mint" />
            <Counter label="Failed" value={failed} dot="bg-red-400" />
          </>
        }
      />
      <JobList jobs={jobs.map(toView)} />
    </main>
  );
}
