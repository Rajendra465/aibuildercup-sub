"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, BarChart3, Loader2, Plus, RefreshCw } from "lucide-react";
import type { Campaign } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CampaignCard } from "./campaign-card";
import { CampaignForm } from "./campaign-form";
import { errorMessage, fetchJson, todayIso } from "./campaign-utils";

interface CampaignsResponse {
  success: boolean;
  campaigns: Campaign[];
  error?: string;
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

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Brand Studio</h1>
          <p className="mt-1 max-w-2xl text-slate-400">
            Brief a campaign once. InScene matches it to brand-safe scenes, renders it into the shot for the right
            viewers, and makes it shoppable on pause.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/brands/dashboard" className={cn(buttonVariants({ variant: "outline" }), "h-9 px-3")}>
            <BarChart3 aria-hidden="true" />
            Dashboard
          </Link>
          <Button variant="ghost" className="h-9 px-3" onClick={() => void load()} disabled={isLoading} aria-label="Refresh campaigns">
            <RefreshCw className={cn(isLoading && "animate-spin")} aria-hidden="true" />
          </Button>
          <Button className="h-9 bg-[#F2A541] px-3 text-black hover:bg-[#e0922c]" onClick={() => setIsFormOpen(true)}>
            <Plus aria-hidden="true" />
            New campaign
          </Button>
        </div>
      </header>

      <div aria-live="polite" className="flex flex-col gap-2">
        {notice && (
          <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            {notice}
            <button type="button" className="text-xs underline" onClick={() => setNotice(null)}>
              Dismiss
            </button>
          </div>
        )}
        {actionError && (
          <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
            {actionError}
          </div>
        )}
      </div>

      {loadError ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">
          <p className="flex items-center gap-2">
            <AlertCircle className="size-4" aria-hidden="true" />
            {loadError}
          </p>
          <Button variant="outline" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      ) : isLoading && campaigns.length === 0 ? (
        <div className="flex items-center justify-center gap-2 p-16 text-slate-400">
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          Loading campaigns…
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 p-12 text-center text-slate-400">
          <p className="text-lg text-white">No campaigns yet</p>
          <p className="mt-1 text-sm">Create your first brief and it will be eligible for in-scene placement immediately.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <li key={campaign.id}>
              <CampaignCard
                campaign={campaign}
                today={today}
                isDeleting={deletingId === campaign.id}
                onDelete={(id) => void handleDelete(id)}
              />
            </li>
          ))}
        </ul>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-zinc-900 p-6 sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">New campaign</DialogTitle>
            <DialogDescription>
              Everything the matcher, safety check and Gemini render need. Fields marked * are required.
            </DialogDescription>
          </DialogHeader>
          <CampaignForm onCreated={handleCreated} onCancel={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>
    </main>
  );
}
