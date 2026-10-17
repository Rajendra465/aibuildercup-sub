"use client";

import { Clapperboard, FileText, LoaderCircle, MousePointerClick, RefreshCw, Trash2 } from "lucide-react";
import type { AdaptiveSlot, GenerationJob, ViewerProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StatusMessage, type Status } from "./status-message";
import { AdSlotInspector } from "./ad-slot-inspector";
import { InspectorSection } from "./inspector-section";
import { VariantCard } from "./variant-card";
import { SLOT_TONES } from "./editor-theme";

interface SegmentInspectorProps {
  movieId: string;
  slot: AdaptiveSlot;
  profiles: ViewerProfile[];
  status: Status | null;
  onDismissStatus: () => void;
  isConfirmingDelete: boolean;
  onCancelDelete: () => void;
  onDelete: () => void;
  selectedProfileId: string;
  onProfileChange: (profileId: string) => void;
  isRegenerating: boolean;
  onRegenerate: () => void;
  variants: GenerationJob[];
  brandNames: ReadonlyMap<string, string>;
  onJobUpdated: (job: GenerationJob) => void;
}

/** Right-hand glass inspector for the selected segment. */
export function SegmentInspector({
  movieId,
  slot,
  profiles,
  status,
  onDismissStatus,
  isConfirmingDelete,
  onCancelDelete,
  onDelete,
  selectedProfileId,
  onProfileChange,
  isRegenerating,
  onRegenerate,
  variants,
  brandNames,
  onJobUpdated,
}: SegmentInspectorProps) {
  const tone = SLOT_TONES[slot.type];

  return (
    <div className="glass-strong overflow-hidden rounded-3xl">
      <div className="relative border-b border-white/[0.08] p-4 sm:p-5">
        <div className={cn("absolute inset-x-0 top-0 h-px", tone.swatch)} aria-hidden="true" />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.25em] text-muted-foreground uppercase">
              <span className={cn("size-1.5 rounded-full", tone.swatch)} aria-hidden="true" />
              Inspector · {tone.label}
            </p>
            <h2 className="truncate text-xl font-semibold text-white">{slot.label}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span className="font-mono">{slot.type}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {slot.startSeconds.toFixed(3)}s – {slot.endSeconds.toFixed(3)}s
              </span>
            </div>
          </div>
          <div className="flex shrink-0 gap-1.5">
            {isConfirmingDelete && (
              <Button variant="ghost" size="sm" onClick={onCancelDelete}>
                Cancel
              </Button>
            )}
            <Button variant="destructive" size="sm" onClick={onDelete}>
              <Trash2 className="size-3.5" aria-hidden />
              {isConfirmingDelete ? "Confirm delete" : "Delete"}
            </Button>
          </div>
        </div>
        {status && (
          <div className="mt-3">
            <StatusMessage status={status} onDismiss={onDismissStatus} />
          </div>
        )}
      </div>

      <InspectorSection id={`brief-${slot.id}`} title="Segment brief" icon={FileText} tone="violet">
        <div className="space-y-4 text-sm text-slate-300">
          <div>
            <strong className="mb-1 block text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Narrative Purpose</strong>
            <p className="leading-relaxed text-slate-200">{slot.narrativePurpose}</p>
          </div>
          <div>
            <strong className="mb-1.5 block text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Editable Fields</strong>
            <div className="flex flex-wrap gap-1.5">
              {slot.editableFields.map((field) => (
                <span key={field} className="rounded-full border border-violet/35 bg-violet/10 px-2 py-0.5 text-xs text-violet-100">
                  {field}
                </span>
              ))}
            </div>
          </div>
          <div>
            <strong className="mb-1.5 block text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Immutable Facts</strong>
            <ul className="space-y-1">
              {slot.immutableFacts.map((fact) => (
                <li key={fact} className="flex gap-2 leading-relaxed">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-white/40" aria-hidden="true" />
                  {fact}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </InspectorSection>

      {slot.type === "ADSPOT_BILLBOARD" && <AdSlotInspector movieId={movieId} slot={slot} profiles={profiles} />}

      <InspectorSection
        id={`variants-${slot.id}`}
        title="Generated Variants"
        icon={Clapperboard}
        tone="mint"
        meta={
          variants.length > 0 ? (
            <span className="rounded-full bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-slate-200">{variants.length}</span>
          ) : undefined
        }
      >
        <div className="space-y-3 text-sm">
          <p className="text-xs text-muted-foreground">Latest ready variant powers viewer cut</p>
          <div className="flex gap-2">
            <select
              aria-label="Viewer profile"
              value={selectedProfileId}
              onChange={(event) => onProfileChange(event.target.value)}
              className="h-9 min-w-0 flex-1 cursor-pointer rounded-xl border border-white/15 bg-white/[0.04] px-2.5 text-sm text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-amber/60 [&>option]:bg-night"
            >
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.displayName} · {profile.city}
                </option>
              ))}
            </select>
            <Button className="h-9 px-3" onClick={onRegenerate} disabled={isRegenerating} title="Generate new variant">
              {isRegenerating ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              <span className="sr-only">Regenerate selected segment</span>
            </Button>
          </div>
          {variants.length ? (
            <div className="space-y-2.5">
              {variants.map((variant, index) => {
                const profile = profiles.find((candidate) => candidate.id === variant.profileId) || variant.profileSnapshot;
                return (
                  <VariantCard
                    key={variant.id}
                    variant={variant}
                    profileLabel={`${profile.displayName} · ${profile.city}`}
                    isCurrent={index === 0}
                    brandNames={brandNames}
                    onJobUpdated={onJobUpdated}
                  />
                );
              })}
            </div>
          ) : (
            <div className="grid place-items-center gap-1.5 rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-muted-foreground">
              <Clapperboard className="size-5 opacity-50" aria-hidden />
              No variants generated yet.
            </div>
          )}
        </div>
      </InspectorSection>
    </div>
  );
}

export function InspectorEmptyState() {
  return (
    <div className="glass grid min-h-64 place-items-center rounded-3xl border-dashed p-8 text-center text-muted-foreground">
      <div className="grid place-items-center gap-2">
        <MousePointerClick className="size-6 text-amber/70 animate-float" aria-hidden />
        Select a slot to inspect
      </div>
    </div>
  );
}
