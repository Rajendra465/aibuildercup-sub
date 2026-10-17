"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { AdSlotInfo } from "./ad-client";

interface AdPauseCardProps {
  slot: AdSlotInfo;
  onCtaClick: (slot: AdSlotInfo) => void;
}

const QR_SIZE_PX = 112;

function useQrDataUrl(url: string): string | null {
  const [qr, setQr] = useState<{ url: string; dataUrl: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { margin: 1, width: QR_SIZE_PX * 2, color: { dark: "#0a0a0a", light: "#ffffff" } })
      .then((dataUrl) => {
        if (!cancelled) setQr({ url, dataUrl });
      })
      .catch((cause: unknown) => console.error("Failed to render QR code", cause));
    return () => {
      cancelled = true;
    };
  }, [url]);

  return qr?.url === url ? qr.dataUrl : null;
}

/** Shoppable pause: shown over the video when the viewer pauses on a branded surface. */
export function AdPauseCard({ slot, onCtaClick }: AdPauseCardProps) {
  const campaign = slot.decision.campaign;
  const qrDataUrl = useQrDataUrl(campaign?.landingUrl ?? "");
  if (!campaign) return null;

  const isPsa = slot.decision.kind === "PUBLIC_SERVICE";
  const accent = campaign.brandColors[0] || "#F2A541";

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[3px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        className="glass-strong pointer-events-auto relative w-full max-w-xl overflow-hidden rounded-3xl shadow-[0_0_0_1px_rgb(242_165_65/0.3),0_30px_90px_-20px_rgb(242_165_65/0.4)]"
        role="dialog"
        aria-label={`${campaign.brandName} — ${campaign.productName}`}
        initial={{ opacity: 0, scale: 0.9, y: 16, filter: "blur(10px)" }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 0.95, y: 8, filter: "blur(6px)" }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
      >
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${accent}, #F2A541, #8B5CF6)` }} />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -left-16 size-56 rounded-full opacity-30 blur-3xl"
          style={{ background: accent }}
        />
        <div className="relative flex gap-5 p-5 sm:p-6">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex items-center gap-3">
              {campaign.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- campaign assets are arbitrary remote/generated URLs
                <img src={campaign.logoUrl} alt={`${campaign.brandName} logo`} className="size-11 rounded-xl border border-white/10 bg-white/10 object-contain p-1" />
              )}
              <div className="min-w-0">
                <div className="text-[11px] font-semibold tracking-[0.2em] text-amber uppercase">
                  {isPsa ? "Public service · In this scene" : "Seen in this scene"}
                </div>
                <div className="truncate text-lg font-semibold text-white">{campaign.brandName}</div>
              </div>
            </div>
            <div>
              <div className="font-medium text-white/90">{campaign.productName}</div>
              <p className="mt-1 text-sm text-muted-foreground">{campaign.tagline}</p>
              {campaign.seasonLabel && (
                <span className="mt-2 inline-block rounded-full border border-amber/40 bg-amber/10 px-2.5 py-0.5 text-[11px] text-amber">
                  {campaign.seasonLabel}
                </span>
              )}
            </div>
            <a
              href={campaign.landingUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onCtaClick(slot)}
              className={buttonVariants({ className: "mt-1 h-10 w-fit px-4" })}
            >
              {campaign.ctaLabel}
              <ExternalLink className="size-4" />
            </a>
          </div>
          <div className="hidden shrink-0 flex-col items-center gap-3 sm:flex">
            {campaign.productImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- campaign assets are arbitrary remote/generated URLs
              <img src={campaign.productImageUrl} alt={campaign.productName} className="h-24 w-28 rounded-xl border border-white/10 object-cover" />
            )}
            {qrDataUrl && (
              <div className="flex flex-col items-center gap-1.5">
                <div className="rounded-xl bg-white p-1.5 shadow-[0_0_30px_-8px_rgb(255_255_255/0.5)]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- QR is a generated data URL */}
                  <img src={qrDataUrl} alt={`QR code for ${campaign.landingUrl}`} width={QR_SIZE_PX} height={QR_SIZE_PX} className="rounded-md" />
                </div>
                <span className="text-[10px] text-muted-foreground">Scan on your phone</span>
              </div>
            )}
          </div>
        </div>
        <div className="relative border-t border-white/10 px-5 py-3 text-[11px] text-muted-foreground sm:px-6">
          Press play to resume · Ad rendered into the scene by InScene
        </div>
      </motion.div>
    </motion.div>
  );
}
