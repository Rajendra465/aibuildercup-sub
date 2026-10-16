"use client";

import { useState } from "react";
import Image from "next/image";
import { CalendarDays, ExternalLink, HeartHandshake, MapPin, ShieldOff, Trash2 } from "lucide-react";
import type { Campaign } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, FLIGHT_STATUS_LABELS, type FlightStatus, flightStatus, targetingSummary } from "./campaign-utils";

interface CampaignCardProps {
  campaign: Campaign;
  today: string;
  isDeleting: boolean;
  onDelete: (id: string) => void;
}

const STATUS_STYLES: Readonly<Record<FlightStatus, string>> = {
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  scheduled: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  ended: "bg-zinc-700/40 text-zinc-400 border-zinc-600",
};

function flightLabel(campaign: Campaign): string {
  if (!campaign.flightStart && !campaign.flightEnd) return "Always on";
  return `${campaign.flightStart ?? "now"} → ${campaign.flightEnd ?? "open-ended"}`;
}

export function CampaignCard({ campaign, today, isDeleting, onDelete }: CampaignCardProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const status = flightStatus(campaign, today);
  const heroImage = campaign.productImageUrl ?? campaign.logoUrl;

  return (
    <Card className="bg-zinc-900 ring-white/10">
      <div className="relative aspect-[16/9] w-full bg-zinc-950">
        {heroImage ? (
          <Image
            src={heroImage}
            alt={`${campaign.productName} product shot`}
            fill
            unoptimized
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-contain p-4"
          />
        ) : (
          <div
            className="flex h-full items-center justify-center text-3xl font-bold tracking-tight text-white/80"
            style={{
              background: campaign.brandColors.length
                ? `linear-gradient(135deg, ${campaign.brandColors.join(", ")})`
                : undefined,
            }}
          >
            {campaign.brandName}
          </div>
        )}
        {campaign.logoUrl && campaign.productImageUrl && (
          <div className="absolute bottom-2 left-2 size-10 overflow-hidden rounded-md bg-white/90 p-1">
            <div className="relative size-full">
              <Image src={campaign.logoUrl} alt={`${campaign.brandName} logo`} fill unoptimized sizes="40px" className="object-contain" />
            </div>
          </div>
        )}
        <span className={cn("absolute top-2 right-2 rounded-full border px-2 py-0.5 text-xs font-medium", STATUS_STYLES[status])}>
          {FLIGHT_STATUS_LABELS[status]}
        </span>
      </div>

      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-white">
          {campaign.brandName}
          {campaign.isPublicService && (
            <Badge className="border-teal-500/40 bg-teal-500/15 text-teal-300">
              <HeartHandshake aria-hidden="true" />
              PSA
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-slate-300">{campaign.productName}</p>
        <p className="text-sm text-slate-400 italic">&ldquo;{campaign.tagline}&rdquo;</p>
      </CardHeader>

      <CardContent className="flex flex-col gap-2 text-xs text-slate-400">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="border-white/15 text-slate-300">
            {CATEGORY_LABELS[campaign.category] ?? campaign.category}
          </Badge>
          <Badge variant="outline" className="border-white/15 text-slate-300">
            Bid {campaign.bidWeight}
          </Badge>
          {campaign.seasonLabel && (
            <Badge variant="outline" className="border-[#F2A541]/40 text-[#F2A541]">
              {campaign.seasonLabel}
            </Badge>
          )}
        </div>
        <p className="flex items-start gap-1.5">
          <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>{targetingSummary(campaign)}</span>
        </p>
        <p className="flex items-start gap-1.5">
          <CalendarDays className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>{flightLabel(campaign)}</span>
        </p>
        {campaign.avoidContexts.length > 0 && (
          <p className="flex items-start gap-1.5">
            <ShieldOff className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span>Avoids: {campaign.avoidContexts.join(", ")}</span>
          </p>
        )}
      </CardContent>

      <CardFooter className="justify-between gap-2 border-white/10 bg-zinc-950/40">
        <a
          href={campaign.landingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-[#F2A541] hover:underline"
        >
          {campaign.ctaLabel}
          <ExternalLink className="size-3" aria-hidden="true" />
        </a>
        {isConfirming ? (
          <div className="flex items-center gap-1.5" role="group" aria-label={`Confirm deleting ${campaign.brandName}`}>
            <span className="text-xs text-slate-300">Delete?</span>
            <Button size="sm" variant="destructive" disabled={isDeleting} onClick={() => onDelete(campaign.id)}>
              {isDeleting ? "Deleting…" : "Yes, delete"}
            </Button>
            <Button size="sm" variant="ghost" disabled={isDeleting} onClick={() => setIsConfirming(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Delete ${campaign.brandName} campaign`}
            onClick={() => setIsConfirming(true)}
          >
            <Trash2 aria-hidden="true" />
            Delete
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
