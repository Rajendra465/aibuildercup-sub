"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, AudioLines, Eye, Loader2, MousePointerClick, PauseCircle, Percent } from "lucide-react";
import type { AnalyticsSummary, CampaignStats } from "@/lib/ads/analytics";
import type { Campaign } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { errorMessage, fetchJson } from "../campaign-utils";

const REFRESH_MS = 5000;

interface EventsResponse {
  success: boolean;
  summary: AnalyticsSummary;
  campaigns: Campaign[];
  error?: string;
}

interface KpiTileProps {
  label: string;
  value: string;
  icon: LucideIcon;
}

const formatCount = (value: number) => value.toLocaleString();
const formatRate = (value: number) => `${(value * 100).toFixed(1)}%`;

function KpiTile({ label, value, icon: Icon }: KpiTileProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900 p-4">
      <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-slate-400 uppercase">
        <Icon className="size-4 text-[#F2A541]" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 text-3xl font-semibold text-white tabular-nums">{value}</p>
    </div>
  );
}

interface CityBarsProps {
  stats: CampaignStats;
}

function CityBars({ stats }: CityBarsProps) {
  const rows = Object.entries(stats.byCity).sort(([, left], [, right]) => right - left);
  const max = rows[0]?.[1] ?? 0;

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900 p-4">
      <h3 className="mb-3 font-semibold text-white">{stats.brandName}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">No impressions yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map(([city, count]) => (
            <li key={city} className="grid grid-cols-[6rem_1fr_3rem] items-center gap-2 text-sm">
              <span className="truncate text-slate-300" title={city}>
                {city}
              </span>
              <div
                className="h-3 overflow-hidden rounded-full bg-white/5"
                role="img"
                aria-label={`${city}: ${count} impressions`}
              >
                <div className="h-full rounded-full bg-[#F2A541]" style={{ width: `${max ? (count / max) * 100 : 0}%` }} />
              </div>
              <span className="text-right text-slate-400 tabular-nums">{formatCount(count)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface StatsTableProps {
  campaigns: CampaignStats[];
}

function StatsTable({ campaigns }: StatsTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[640px] text-left text-sm">
        <caption className="sr-only">Per-campaign delivery and engagement</caption>
        <thead className="bg-zinc-900 text-xs tracking-wide text-slate-400 uppercase">
          <tr>
            <th scope="col" className="px-4 py-3">Campaign</th>
            <th scope="col" className="px-4 py-3 text-right">Impressions</th>
            <th scope="col" className="px-4 py-3 text-right">Pause views</th>
            <th scope="col" className="px-4 py-3 text-right">Clicks</th>
            <th scope="col" className="px-4 py-3 text-right">CTR</th>
            <th scope="col" className="px-4 py-3 text-right">Avg exposure</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {campaigns.map((stats) => (
            <tr key={stats.campaignId} className="bg-zinc-950 hover:bg-zinc-900/60">
              <th scope="row" className="px-4 py-3 font-medium text-white">{stats.brandName}</th>
              <td className="px-4 py-3 text-right tabular-nums">{formatCount(stats.impressions)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatCount(stats.pauseViews)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatCount(stats.clicks)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatRate(stats.clickRate)}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {stats.avgExposure === null ? <span className="text-slate-500">—</span> : `${stats.avgExposure}/100`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-white/15 p-12 text-center text-slate-400">
      <p className="text-lg text-white">No ad events yet</p>
      <p className="mx-auto mt-2 max-w-xl text-sm">
        Data appears here once viewers watch cuts with in-scene ads: every rendered placement logs an impression, and
        pausing, clicking the shoppable card or hearing an audio ad are tracked too.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/watch" className={cn(buttonVariants(), "h-9 bg-[#F2A541] px-4 text-black hover:bg-[#e0922c]")}>
          Watch a cut
        </Link>
        <Link href="/brands" className={cn(buttonVariants({ variant: "outline" }), "h-9 px-4")}>
          Manage campaigns
        </Link>
      </div>
    </div>
  );
}

export function AdvertiserDashboard() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const body = await fetchJson<EventsResponse>("/api/ads/events");
      setSummary(body.summary);
      setUpdatedAt(new Date());
      setError(null);
    } catch (loadError) {
      setError(errorMessage(loadError, "Could not load analytics"));
    }
  }, []);

  useEffect(() => {
    const first = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [load]);

  const totals = summary?.totals;
  const clickRate = totals && totals.impressions ? totals.clicks / totals.impressions : 0;
  const hasData = Boolean(summary && summary.campaigns.length > 0);

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Brand Dashboard</h1>
          <p className="mt-1 text-slate-400">Live delivery of in-scene placements across every personalised cut.</p>
        </div>
        <p className="text-xs text-slate-500" aria-live="polite">
          Auto-refreshes every {REFRESH_MS / 1000}s
          {updatedAt && ` · updated ${updatedAt.toLocaleTimeString()}`}
        </p>
      </header>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          {error}
          {summary && <span className="text-red-400/70">(showing last good data)</span>}
        </div>
      )}

      {!summary && !error ? (
        <div className="flex items-center justify-center gap-2 p-16 text-slate-400">
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          Loading analytics…
        </div>
      ) : summary && totals ? (
        <>
          <section aria-label="Totals" className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <KpiTile label="Impressions" value={formatCount(totals.impressions)} icon={Eye} />
            <KpiTile label="Pause views" value={formatCount(totals.pauseViews)} icon={PauseCircle} />
            <KpiTile label="Clicks" value={formatCount(totals.clicks)} icon={MousePointerClick} />
            <KpiTile label="Click rate" value={formatRate(clickRate)} icon={Percent} />
            <KpiTile label="Audio plays" value={formatCount(totals.audioPlays)} icon={AudioLines} />
          </section>

          {hasData ? (
            <>
              <section aria-labelledby="campaign-table-heading" className="flex flex-col gap-3">
                <h2 id="campaign-table-heading" className="text-lg font-semibold text-white">By campaign</h2>
                <StatsTable campaigns={summary.campaigns} />
              </section>
              <section aria-labelledby="city-heading" className="flex flex-col gap-3">
                <h2 id="city-heading" className="text-lg font-semibold text-white">Impressions by city</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {summary.campaigns.map((stats) => (
                    <CityBars key={stats.campaignId} stats={stats} />
                  ))}
                </div>
              </section>
            </>
          ) : (
            <EmptyState />
          )}
        </>
      ) : null}
    </main>
  );
}
