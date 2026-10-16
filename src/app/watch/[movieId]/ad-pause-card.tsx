"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { ExternalLink } from "lucide-react";
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
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 backdrop-blur-[2px] p-4 pointer-events-none">
      <div
        className="pointer-events-auto w-full max-w-xl rounded-xl border border-[#F2A541]/40 bg-zinc-950/95 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-label={`${campaign.brandName} — ${campaign.productName}`}
      >
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${accent}, #F2A541)` }} />
        <div className="p-5 flex gap-5">
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              {campaign.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- campaign assets are arbitrary remote/generated URLs
                <img src={campaign.logoUrl} alt={`${campaign.brandName} logo`} className="h-10 w-10 rounded-md object-contain bg-white/5 p-1" />
              )}
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[#F2A541]">
                  {isPsa ? "Public service · In this scene" : "Seen in this scene"}
                </div>
                <div className="text-lg font-semibold text-slate-100 truncate">{campaign.brandName}</div>
              </div>
            </div>
            <div>
              <div className="text-slate-200 font-medium">{campaign.productName}</div>
              <p className="text-sm text-slate-400 mt-1">{campaign.tagline}</p>
              {campaign.seasonLabel && (
                <span className="mt-2 inline-block rounded-full border border-[#F2A541]/40 px-2 py-0.5 text-[11px] text-[#F2A541]">
                  {campaign.seasonLabel}
                </span>
              )}
            </div>
            <a
              href={campaign.landingUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onCtaClick(slot)}
              className="mt-1 inline-flex w-fit items-center gap-2 rounded-md bg-[#F2A541] px-4 py-2 text-sm font-semibold text-black hover:bg-[#f5b866] transition-colors"
            >
              {campaign.ctaLabel}
              <ExternalLink className="size-4" />
            </a>
          </div>
          <div className="hidden sm:flex flex-col items-center gap-3 shrink-0">
            {campaign.productImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- campaign assets are arbitrary remote/generated URLs
              <img src={campaign.productImageUrl} alt={campaign.productName} className="h-24 w-28 rounded-md object-cover border border-zinc-800" />
            )}
            {qrDataUrl && (
              <div className="flex flex-col items-center gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element -- QR is a generated data URL */}
                <img src={qrDataUrl} alt={`QR code for ${campaign.landingUrl}`} width={QR_SIZE_PX} height={QR_SIZE_PX} className="rounded" />
                <span className="text-[10px] text-slate-500">Scan on your phone</span>
              </div>
            )}
          </div>
        </div>
        <div className="px-5 pb-3 text-[11px] text-slate-500">Press play to resume · Ad rendered into the scene by InScene</div>
      </div>
    </div>
  );
}
