"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MotionConfig } from "framer-motion";
import { AlertCircle, ArrowLeft, AudioLines, Eye, MousePointerClick, PauseCircle, Percent } from "lucide-react";
import type { AnalyticsSummary } from "@/lib/ads/analytics";
import type { Campaign } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { FadeIn, PageHeader, Stagger, StaggerItem } from "@/components/fx/motion";
import { cn } from "@/lib/utils";
import { errorMessage, fetchJson } from "../campaign-utils";
import { CityBars, EmptyState, KpiSkeleton, KpiTile, LiveIndicator, StatsTable, formatCount, formatRate } from "./dashboard-parts";

const REFRESH_MS = 5000;
const HISTORY_POINTS = 24;

interface EventsResponse {
  success: boolean;
  summary: AnalyticsSummary;
  campaigns: Campaign[];
  error?: string;
}

type Totals = AnalyticsSummary["totals"];

const rateOf = (totals: Totals) => (totals.impressions ? totals.clicks / totals.impressions : 0);

export function AdvertiserDashboard() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  // Totals seen on each poll this session; drives the KPI sparklines.
  const [history, setHistory] = useState<Totals[]>([]);

  const load = useCallback(async () => {
    try {
      const body = await fetchJson<EventsResponse>("/api/ads/events");
      setSummary(body.summary);
      setHistory((current) => [...current, body.summary.totals].slice(-HISTORY_POINTS));
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
  const clickRate = totals ? rateOf(totals) : 0;
  const hasData = Boolean(summary && summary.campaigns.length > 0);

  return (
    <MotionConfig reducedMotion="user">
      <main className="relative mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 pt-10 pb-24 sm:px-6">
        <PageHeader
          kicker="Advertiser analytics"
          title={
            <>
              Brand <span className="text-gradient">Dashboard</span>
            </>
          }
          lede="Live delivery of in-scene placements across every personalised cut."
          actions={
            <>
              <LiveIndicator seconds={REFRESH_MS / 1000} updatedAt={updatedAt} isHealthy={!error} />
              <Link href="/brands" className={cn(buttonVariants({ variant: "outline" }), "h-10 px-4")}>
                <ArrowLeft aria-hidden="true" />
                Campaigns
              </Link>
            </>
          }
        />

        {error && (
          <FadeIn y={6}>
            <div role="alert" className="glass flex flex-wrap items-center gap-2 rounded-xl border-red-500/40 px-4 py-2.5 text-sm text-red-200">
              <AlertCircle className="size-4 shrink-0 text-red-400" aria-hidden="true" />
              {error}
              {summary && <span className="text-red-300/70">(showing last good data)</span>}
            </div>
          </FadeIn>
        )}

        {!summary && !error ? (
          <KpiSkeleton />
        ) : summary && totals ? (
          <>
            <section aria-label="Totals">
              <Stagger className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <StaggerItem>
                  <KpiTile label="Impressions" value={totals.impressions} format={formatCount} icon={Eye} tone="amber" history={history.map((point) => point.impressions)} />
                </StaggerItem>
                <StaggerItem>
                  <KpiTile label="Pause views" value={totals.pauseViews} format={formatCount} icon={PauseCircle} tone="violet" history={history.map((point) => point.pauseViews)} />
                </StaggerItem>
                <StaggerItem>
                  <KpiTile label="Clicks" value={totals.clicks} format={formatCount} icon={MousePointerClick} tone="azure" history={history.map((point) => point.clicks)} />
                </StaggerItem>
                <StaggerItem>
                  <KpiTile label="Click rate" value={clickRate} format={formatRate} icon={Percent} tone="mint" history={history.map(rateOf)} />
                </StaggerItem>
                <StaggerItem className="col-span-2 md:col-span-1">
                  <KpiTile label="Audio plays" value={totals.audioPlays} format={formatCount} icon={AudioLines} tone="rose" history={history.map((point) => point.audioPlays)} />
                </StaggerItem>
              </Stagger>
            </section>

            {hasData ? (
              <>
                <FadeIn>
                  <section aria-labelledby="campaign-table-heading" className="flex flex-col gap-3">
                    <h2 id="campaign-table-heading" className="text-xl font-semibold text-white">By campaign</h2>
                    <StatsTable campaigns={summary.campaigns} />
                  </section>
                </FadeIn>
                <section aria-labelledby="city-heading" className="flex flex-col gap-3">
                  <h2 id="city-heading" className="text-xl font-semibold text-white">Impressions by city</h2>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {summary.campaigns.map((stats, index) => (
                      <CityBars key={stats.campaignId} stats={stats} index={index} />
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
    </MotionConfig>
  );
}
