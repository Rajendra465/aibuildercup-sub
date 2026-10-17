"use client";

import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import { animate, motion, useInView, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { BarChart3, Clapperboard, MousePointerClick, PauseCircle } from "lucide-react";
import type { CampaignStats } from "@/lib/ads/analytics";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const SPARK_WIDTH = 100;
const SPARK_HEIGHT = 32;
const SPARK_PAD = 3;

export const formatCount = (value: number) => Math.round(value).toLocaleString();
export const formatRate = (value: number) => `${(value * 100).toFixed(1)}%`;

export type KpiTone = "amber" | "violet" | "azure" | "mint" | "rose";

const TONES: Readonly<Record<KpiTone, { stroke: string; icon: string; glow: string }>> = {
  amber: { stroke: "#F2A541", icon: "text-amber bg-amber/15 border-amber/30", glow: "bg-amber/25" },
  violet: { stroke: "#8B5CF6", icon: "text-violet-300 bg-violet/15 border-violet/30", glow: "bg-violet/25" },
  azure: { stroke: "#3B6BFF", icon: "text-sky-300 bg-azure/15 border-azure/30", glow: "bg-azure/25" },
  mint: { stroke: "#34D399", icon: "text-mint bg-mint/15 border-mint/30", glow: "bg-mint/25" },
  rose: { stroke: "#F472B6", icon: "text-pink-300 bg-pink-500/15 border-pink-400/30", glow: "bg-pink-500/25" },
};

interface LiveNumberProps {
  value: number;
  format: (value: number) => string;
}

/** Counts up on first reveal, then glides from the previous value on every poll instead of restarting at 0. */
function LiveNumber({ value, format }: LiveNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(0);
  const inView = useInView(ref, { once: true });
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!inView) return;
    const from = previous.current;
    previous.current = value;
    const node = ref.current;
    if (!node) return;
    if (reduceMotion) {
      node.textContent = format(value);
      return;
    }
    const controls = animate(from, value, {
      duration: from === 0 ? 1.2 : 0.6,
      ease: EASE,
      onUpdate: (latest) => {
        node.textContent = format(latest);
      },
    });
    return () => controls.stop();
  }, [inView, value, format, reduceMotion]);

  return (
    <>
      <span className="sr-only">{format(value)}</span>
      <span ref={ref} aria-hidden="true" className="tabular-nums">
        {format(0)}
      </span>
    </>
  );
}

function sparkPoints(values: readonly number[]): [number, number][] {
  const series = values.length >= 2 ? values : [0, 0];
  const max = Math.max(...series);
  const min = Math.min(...series);
  const span = max - min || 1;
  const usable = SPARK_HEIGHT - SPARK_PAD * 2;
  return series.map((point, index) => [
    (index / (series.length - 1)) * SPARK_WIDTH,
    max === min ? SPARK_HEIGHT * 0.65 : SPARK_PAD + usable - ((point - min) / span) * usable,
  ]);
}

/** Tiny SVG trend of the values seen across refreshes in this session. */
function Sparkline({ values, color }: { values: readonly number[]; color: string }) {
  const gradientId = `spark-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const points = sparkPoints(values);
  const line = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `${line} L${SPARK_WIDTH},${SPARK_HEIGHT} L0,${SPARK_HEIGHT} Z`;

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
      preserveAspectRatio="none"
      className="h-9 w-full overflow-visible"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

interface KpiTileProps {
  label: string;
  value: number;
  format: (value: number) => string;
  icon: LucideIcon;
  tone: KpiTone;
  history: readonly number[];
}

export function KpiTile({ label, value, format, icon: Icon, tone, history }: KpiTileProps) {
  const style = TONES[tone];
  const last = history.at(-1);
  const prior = history.at(-2);
  const delta = last !== undefined && prior !== undefined ? last - prior : 0;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="glass group relative flex flex-col gap-3 overflow-hidden rounded-2xl p-4"
    >
      <div aria-hidden="true" className={cn("absolute -top-10 -right-10 size-28 rounded-full opacity-60 blur-2xl transition-opacity group-hover:opacity-100", style.glow)} />
      <div className="relative flex items-center justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
        <span className={cn("flex size-8 items-center justify-center rounded-xl border", style.icon)}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      <div className="relative flex items-baseline gap-2">
        <p className="font-display text-3xl font-semibold text-white">
          <LiveNumber value={value} format={format} />
        </p>
        {delta > 0 && (
          <motion.span
            key={last}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-full bg-mint/15 px-1.5 py-0.5 text-[10px] font-semibold text-mint"
          >
            ▲
            <span className="sr-only"> up since last refresh</span>
          </motion.span>
        )}
      </div>
      <Sparkline values={history} color={style.stroke} />
    </motion.div>
  );
}

export function KpiSkeleton() {
  return (
    <div role="status" className="grid grid-cols-2 gap-3 md:grid-cols-5">
      <span className="sr-only">Loading analytics…</span>
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} aria-hidden="true" className="glass flex h-[9.25rem] flex-col gap-3 rounded-2xl p-4">
          <div className="shimmer-bg h-3 w-20 animate-shimmer rounded bg-white/[0.06]" />
          <div className="shimmer-bg h-8 w-24 animate-shimmer rounded bg-white/[0.06]" />
          <div className="shimmer-bg mt-auto h-8 w-full animate-shimmer rounded bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}

export function CityBars({ stats, index }: { stats: CampaignStats; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const rows = Object.entries(stats.byCity).sort(([, left], [, right]) => right - left);
  const max = rows[0]?.[1] ?? 0;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.5, ease: EASE, delay: Math.min(index * 0.06, 0.4) }}
      className="glass rounded-2xl p-5"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="font-semibold text-white">{stats.brandName}</h3>
        <span className="text-xs text-muted-foreground tabular-nums">{formatCount(stats.impressions)} total</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">No impressions yet.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {rows.map(([city, count], rowIndex) => (
            <li key={city} className="grid grid-cols-[6rem_1fr_3rem] items-center gap-3 text-sm">
              <span className="truncate text-slate-300" title={city}>
                {city}
              </span>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]" role="img" aria-label={`${city}: ${count} impressions`}>
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-amber via-amber to-violet shadow-[0_0_12px_rgb(242_165_65/0.45)]"
                  initial={{ width: 0 }}
                  animate={{ width: inView ? `${max ? (count / max) * 100 : 0}%` : 0 }}
                  transition={{ duration: 0.9, ease: EASE, delay: 0.15 + rowIndex * 0.05 }}
                />
              </div>
              <span className="text-right text-slate-400 tabular-nums">{formatCount(count)}</span>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

function ExposureCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-500">—</span>;
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-white/10 sm:inline-block" aria-hidden="true">
        <span className="block h-full rounded-full bg-mint" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </span>
      {`${value}/100`}
    </span>
  );
}

export function StatsTable({ campaigns }: { campaigns: CampaignStats[] }) {
  return (
    <div className="glass overflow-x-auto rounded-2xl">
      <table className="w-full min-w-[640px] text-left text-sm">
        <caption className="sr-only">Per-campaign delivery and engagement</caption>
        <thead className="border-b border-white/10 bg-white/[0.04] text-xs tracking-wide text-muted-foreground uppercase">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">Campaign</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Impressions</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Pause views</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Clicks</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">CTR</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Avg exposure</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 text-slate-200">
          {campaigns.map((stats) => (
            <tr key={stats.campaignId} className="transition-colors hover:bg-white/[0.05]">
              <th scope="row" className="px-4 py-3 font-medium text-white">
                <span className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-amber shadow-[0_0_8px_#F2A541]" aria-hidden="true" />
                  {stats.brandName}
                </span>
              </th>
              <td className="px-4 py-3 text-right tabular-nums">{formatCount(stats.impressions)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatCount(stats.pauseViews)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatCount(stats.clicks)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatRate(stats.clickRate)}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                <ExposureCell value={stats.avgExposure} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const EMPTY_STEPS: readonly { icon: LucideIcon; label: string }[] = [
  { icon: Clapperboard, label: "Rendered placement → impression" },
  { icon: PauseCircle, label: "Viewer pauses → pause view" },
  { icon: MousePointerClick, label: "Shoppable card → click" },
];

export function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="glass relative overflow-hidden rounded-3xl px-6 py-14 text-center"
    >
      <div aria-hidden="true" className="absolute -top-28 left-1/2 size-80 -translate-x-1/2 rounded-full bg-violet/20 blur-3xl" />
      <div aria-hidden="true" className="relative mx-auto mb-6 flex h-24 w-40 animate-float items-end justify-center gap-1.5 rounded-2xl glass-strong p-4">
        {[40, 65, 30, 85, 55].map((height, index) => (
          <span key={index} className="w-4 rounded-t bg-gradient-to-t from-amber/30 to-amber/80" style={{ height: `${height}%` }} />
        ))}
        <BarChart3 className="absolute top-2 right-2 size-4 text-amber/80" />
      </div>
      <p className="relative font-display text-xl font-semibold text-white">No ad events yet</p>
      <p className="relative mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
        Data appears here once viewers watch cuts with in-scene ads: every rendered placement logs an impression, and
        pausing, clicking the shoppable card or hearing an audio ad are tracked too.
      </p>
      <ul className="relative mx-auto mt-6 flex max-w-2xl flex-wrap justify-center gap-2 text-xs text-slate-300">
        {EMPTY_STEPS.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
            <Icon className="size-3.5 text-amber" aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>
      <div className="relative mt-7 flex flex-wrap justify-center gap-2">
        <Link href="/watch" className={cn(buttonVariants(), "h-10 px-5")}>
          Watch a cut
        </Link>
        <Link href="/brands" className={cn(buttonVariants({ variant: "outline" }), "h-10 px-5")}>
          Manage campaigns
        </Link>
      </div>
    </motion.div>
  );
}

interface LiveIndicatorProps {
  seconds: number;
  updatedAt: Date | null;
  isHealthy: boolean;
}

export function LiveIndicator({ seconds, updatedAt, isHealthy }: LiveIndicatorProps) {
  const dot = isHealthy ? "bg-mint" : "bg-red-400";
  return (
    <p className="glass inline-flex min-h-10 items-center gap-2.5 rounded-full px-4 text-xs text-slate-300" aria-live="polite">
      <span className="relative flex size-2" aria-hidden="true">
        <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-70", dot)} />
        <span className={cn("relative inline-flex size-2 rounded-full", dot)} />
      </span>
      <span>
        Auto-refreshes every {seconds}s
        {updatedAt && <span className="text-muted-foreground tabular-nums">{` · updated ${updatedAt.toLocaleTimeString()}`}</span>}
      </span>
    </p>
  );
}
