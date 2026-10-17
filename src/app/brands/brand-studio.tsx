"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { AlertCircle, BarChart3, Clapperboard, Plus, RefreshCw } from "lucide-react";
import type { Campaign } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FadeIn, PageHeader } from "@/components/fx/motion";
import { cn } from "@/lib/utils";
import { CampaignCard } from "./campaign-card";
import { CampaignForm } from "./campaign-form";
import { errorMessage, fetchJson, flightStatus, todayIso } from "./campaign-utils";
import { CampaignSkeletonGrid, ToastStack } from "./studio-ui";

interface CampaignsResponse {
  success: boolean;
  campaigns: Campaign[];
  error?: string;
}

const EASE = [0.22, 1, 0.36, 1] as const;
const STAGGER_STEP = 0.06;
const MAX_STAGGER = 0.5;

interface StudioActionsProps {
  isLoading: boolean;
  onRefresh: () => void;
  onNew: () => void;
}

function StudioActions({ isLoading, onRefresh, onNew }: StudioActionsProps) {
  return (
    <>
      <Link href="/brands/dashboard" className={cn(buttonVariants({ variant: "outline" }), "h-10 px-4")}>
        <BarChart3 aria-hidden="true" />
        Dashboard
      </Link>
      <Button variant="outline" className="size-10 px-0" onClick={onRefresh} disabled={isLoading} aria-label="Refresh campaigns">
        <RefreshCw className={cn(isLoading && "animate-spin")} aria-hidden="true" />
      </Button>
      <Button className="h-10 px-4" onClick={onNew}>
        <Plus aria-hidden="true" />
        New campaign
      </Button>
    </>
  );
}

function SummaryStrip({ campaigns, today }: { campaigns: Campaign[]; today: string }) {
  const active = campaigns.filter((campaign) => flightStatus(campaign, today) === "active").length;
  const scheduled = campaigns.filter((campaign) => flightStatus(campaign, today) === "scheduled").length;
  const items = [
    { label: campaigns.length === 1 ? "campaign" : "campaigns", value: campaigns.length, tone: "text-white" },
    { label: "live now", value: active, tone: "text-mint" },
    { label: "upcoming", value: scheduled, tone: "text-sky-300" },
  ];
  return (
    <FadeIn delay={0.1} className="glass flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl px-5 py-3 text-sm">
      {items.map((item) => (
        <p key={item.label} className="flex items-baseline gap-2">
          <span className={cn("font-display text-xl font-semibold tabular-nums", item.tone)}>{item.value}</span>
          <span className="text-muted-foreground">{item.label}</span>
        </p>
      ))}
    </FadeIn>
  );
}

function EmptyCampaigns({ onNew }: { onNew: () => void }) {
  return (
    <FadeIn className="glass relative flex flex-col items-center overflow-hidden rounded-3xl px-6 py-16 text-center">
      <div aria-hidden="true" className="absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-amber/20 blur-3xl" />
      <div className="relative mb-5 flex size-16 animate-float items-center justify-center rounded-2xl glass-strong glow-amber">
        <Clapperboard className="size-7 text-amber" aria-hidden="true" />
      </div>
      <p className="relative font-display text-xl font-semibold text-white">No campaigns yet</p>
      <p className="relative mt-2 max-w-md text-sm text-muted-foreground">
        Create your first brief and it will be eligible for in-scene placement immediately.
      </p>
      <Button className="relative mt-6 h-10 px-4" onClick={onNew}>
        <Plus aria-hidden="true" />
        New campaign
      </Button>
    </FadeIn>
  );
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="glass flex flex-col items-start gap-3 rounded-2xl border-red-500/40 p-6 text-red-200">
      <p className="flex items-center gap-2">
        <AlertCircle className="size-4 text-red-400" aria-hidden="true" />
        {message}
      </p>
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

export function BrandStudio() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const body = await fetchJson<CampaignsResponse>("/api/campaigns");
      setCampaigns(body.campaigns ?? []);
    } catch (error) {
      setLoadError(errorMessage(error, "Could not load campaigns"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Defer the first fetch out of the effect body so state updates happen in a callback.
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  // Cards only render after the client-side fetch, so this is always the viewer's local day.
  const today = todayIso();

  async function handleDelete(id: string) {
    setDeletingId(id);
    setActionError(null);
    try {
      await fetchJson<{ success: boolean; error?: string }>(`/api/campaigns?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setCampaigns((current) => current.filter((campaign) => campaign.id !== id));
      setNotice("Campaign deleted.");
    } catch (error) {
      setActionError(errorMessage(error, "Could not delete campaign"));
    } finally {
      setDeletingId(null);
    }
  }

  function handleCreated(campaign: Campaign) {
    setCampaigns((current) => [campaign, ...current.filter((existing) => existing.id !== campaign.id)]);
    setIsFormOpen(false);
    setNotice(`“${campaign.brandName}” is live in the matcher.`);
  }

  const openForm = () => setIsFormOpen(true);

  return (
    <MotionConfig reducedMotion="user">
      <main className="relative mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 pt-10 pb-24 sm:px-6">
        <PageHeader
          kicker="Advertisers"
          title={
            <>
              Brand <span className="text-gradient">Studio</span>
            </>
          }
          lede="Brief a campaign once. InScene matches it to brand-safe scenes, renders it into the shot for the right viewers, and makes it shoppable on pause."
          actions={<StudioActions isLoading={isLoading} onRefresh={() => void load()} onNew={openForm} />}
        />

        {!loadError && campaigns.length > 0 && <SummaryStrip campaigns={campaigns} today={today} />}

        {loadError ? (
          <LoadError message={loadError} onRetry={() => void load()} />
        ) : isLoading && campaigns.length === 0 ? (
          <CampaignSkeletonGrid />
        ) : campaigns.length === 0 ? (
          <EmptyCampaigns onNew={openForm} />
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {campaigns.map((campaign, index) => (
                <motion.li
                  key={campaign.id}
                  layout
                  initial={{ opacity: 0, y: 24, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, filter: "blur(6px)", transition: { duration: 0.25 } }}
                  transition={{ duration: 0.5, ease: EASE, delay: Math.min(index * STAGGER_STEP, MAX_STAGGER) }}
                  className="h-full"
                >
                  <CampaignCard
                    campaign={campaign}
                    today={today}
                    isDeleting={deletingId === campaign.id}
                    onDelete={(id) => void handleDelete(id)}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}

        <ToastStack
          notice={notice}
          error={actionError}
          onDismissNotice={() => setNotice(null)}
          onDismissError={() => setActionError(null)}
        />

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="glass-strong max-h-[90vh] gap-0 overflow-y-auto rounded-3xl bg-transparent p-0 ring-0 sm:max-w-3xl">
            <DialogHeader className="border-b border-white/10 px-6 pt-6 pb-5">
              <p className="text-[11px] font-semibold tracking-[0.3em] text-amber uppercase">Campaign brief</p>
              <DialogTitle className="font-display text-2xl font-semibold text-white">New campaign</DialogTitle>
              <DialogDescription>
                Everything the matcher, safety check and Gemini render need. Fields marked * are required.
              </DialogDescription>
            </DialogHeader>
            <CampaignForm onCreated={handleCreated} onCancel={() => setIsFormOpen(false)} />
          </DialogContent>
        </Dialog>
      </main>
    </MotionConfig>
  );
}
