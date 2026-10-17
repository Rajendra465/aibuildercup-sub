"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ExternalLink, HeartHandshake, MapPin, ShieldOff, Trash2 } from "lucide-react";
import type { Campaign } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { TiltCard } from "@/components/fx/motion";
import { CATEGORY_LABELS, flightStatus, targetingSummary } from "./campaign-utils";
import { StatusPill } from "./studio-ui";

interface CampaignCardProps {
  campaign: Campaign;
  today: string;
  isDeleting: boolean;
  onDelete: (id: string) => void;
}

const FALLBACK_GRADIENT = "linear-gradient(135deg, #F2A541 0%, #8B5CF6 60%, #3B6BFF 100%)";

function flightLabel(campaign: Campaign): string {
  if (!campaign.flightStart && !campaign.flightEnd) return "Always on";
  return `${campaign.flightStart ?? "now"} → ${campaign.flightEnd ?? "open-ended"}`;
}

function brandGradient(colors: readonly string[]): string {
  if (colors.length === 0) return FALLBACK_GRADIENT;
  if (colors.length === 1) return `linear-gradient(135deg, ${colors[0]}, #070a1c)`;
  return `linear-gradient(135deg, ${colors.join(", ")})`;
}

function CampaignHero({ campaign, today }: { campaign: Campaign; today: string }) {
  const heroImage = campaign.productImageUrl ?? campaign.logoUrl;
  const gradient = brandGradient(campaign.brandColors);

  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden" style={{ background: gradient }}>
      {/* Soft vignette + film grain feel so every hero reads as a "frame". */}
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(255_255_255/0.25),transparent_60%)]" />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
      {heroImage ? (
        <Image
          src={heroImage}
          alt={`${campaign.productName} product shot`}
          fill
          unoptimized
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-contain p-5 drop-shadow-[0_18px_30px_rgb(0_0_0/0.45)] transition-transform duration-500 group-hover/card:scale-105"
        />
      ) : (
        <div className="relative flex h-full items-center justify-center px-4 text-center font-display text-3xl font-bold tracking-tight text-white drop-shadow-[0_4px_18px_rgb(0_0_0/0.45)]">
          {campaign.brandName}
        </div>
      )}
      {campaign.logoUrl && campaign.productImageUrl && (
        <div className="absolute bottom-3 left-3 size-11 overflow-hidden rounded-xl bg-white/90 p-1.5 shadow-lg ring-1 ring-white/40">
          <div className="relative size-full">
            <Image src={campaign.logoUrl} alt={`${campaign.brandName} logo`} fill unoptimized sizes="44px" className="object-contain" />
          </div>
        </div>
      )}
      <StatusPill status={flightStatus(campaign, today)} className="absolute top-3 right-3" />
    </div>
  );
}

function CampaignDetails({ campaign }: { campaign: Campaign }) {
  return (
    <CardContent className="flex flex-1 flex-col gap-2.5 text-xs text-muted-foreground">
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline" className="border-white/15 bg-white/5 text-slate-200">
          {CATEGORY_LABELS[campaign.category] ?? campaign.category}
        </Badge>
        <Badge variant="outline" className="border-white/15 bg-white/5 text-slate-200">
          Bid {campaign.bidWeight}
        </Badge>
        {campaign.seasonLabel && (
          <Badge variant="outline" className="border-amber/40 bg-amber/10 text-amber">
            {campaign.seasonLabel}
          </Badge>
        )}
      </div>
      <p className="flex items-start gap-1.5">
        <MapPin className="mt-0.5 size-3.5 shrink-0 text-amber/80" aria-hidden="true" />
        <span>{targetingSummary(campaign)}</span>
      </p>
      <p className="flex items-start gap-1.5">
        <CalendarDays className="mt-0.5 size-3.5 shrink-0 text-amber/80" aria-hidden="true" />
        <span>{flightLabel(campaign)}</span>
      </p>
      {campaign.avoidContexts.length > 0 && (
        <p className="flex items-start gap-1.5">
          <ShieldOff className="mt-0.5 size-3.5 shrink-0 text-amber/80" aria-hidden="true" />
          <span>Avoids: {campaign.avoidContexts.join(", ")}</span>
        </p>
      )}
    </CardContent>
  );
}

export function CampaignCard({ campaign, today, isDeleting, onDelete }: CampaignCardProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <TiltCard className="h-full rounded-2xl" max={5}>
      <Card className="h-full gap-3 pt-0">
        <CampaignHero campaign={campaign} today={today} />

        <CardHeader className="gap-1">
          <CardTitle className="flex flex-wrap items-center gap-2 font-display text-lg font-semibold text-white">
            {campaign.brandName}
            {campaign.isPublicService && (
              <Badge className="border-teal-400/40 bg-teal-500/15 text-teal-200">
                <HeartHandshake aria-hidden="true" />
                PSA
              </Badge>
            )}
          </CardTitle>
          <p className="text-sm text-slate-200">{campaign.productName}</p>
          <p className="text-sm text-muted-foreground italic">&ldquo;{campaign.tagline}&rdquo;</p>
        </CardHeader>

        <CampaignDetails campaign={campaign} />

        <CardFooter className="min-h-12 justify-between gap-2 py-2.5">
          <a
            href={campaign.landingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md text-xs font-medium text-amber outline-none hover:underline focus-visible:ring-2 focus-visible:ring-amber/60"
          >
            {campaign.ctaLabel}
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
          <AnimatePresence mode="wait" initial={false}>
            {isConfirming ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-1.5"
                role="group"
                aria-label={`Confirm deleting ${campaign.brandName}`}
              >
                <span className="text-xs text-slate-300">Delete?</span>
                <Button size="sm" variant="destructive" disabled={isDeleting} onClick={() => onDelete(campaign.id)}>
                  {isDeleting ? "Deleting…" : "Yes, delete"}
                </Button>
                <Button size="sm" variant="ghost" disabled={isDeleting} onClick={() => setIsConfirming(false)}>
                  Cancel
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
              >
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-red-300"
                  aria-label={`Delete ${campaign.brandName} campaign`}
                  onClick={() => setIsConfirming(true)}
                >
                  <Trash2 aria-hidden="true" />
                  Delete
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardFooter>
      </Card>
    </TiltCard>
  );
}
