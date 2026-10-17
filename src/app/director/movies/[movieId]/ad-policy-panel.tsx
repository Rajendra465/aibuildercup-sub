"use client";

import { useState } from "react";
import { LoaderCircle, Save, SlidersHorizontal } from "lucide-react";
import type { AdCategory, AdaptiveSlot } from "@/lib/types";
import { policyForSlot } from "@/lib/ads/brand-safety";
import { Button } from "@/components/ui/button";
import { AD_ACCENT, AD_CATEGORIES, errorMessage, fetchJson, jsonInit, reloadWithFlash } from "./director-api";
import { StatusMessage, type Status } from "./status-message";
import { InspectorSection } from "./inspector-section";

interface AdPolicyPanelProps {
  /** Parent should key this component by slot id so the draft resets per slot. */
  slot: AdaptiveSlot;
}

const MIN_PROMINENCE_PCT = 5;
const MAX_PROMINENCE_PCT = 80;

export function AdPolicyPanel({ slot }: AdPolicyPanelProps) {
  const initial = policyForSlot(slot);
  const [blocked, setBlocked] = useState<AdCategory[]>(initial.blockedCategories);
  const [prominencePct, setProminencePct] = useState(Math.round(initial.maxProminence * 100));
  const [requireApproval, setRequireApproval] = useState(initial.requireApproval);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);

  const toggleCategory = (category: AdCategory) =>
    setBlocked((current) =>
      current.includes(category) ? current.filter((entry) => entry !== category) : [...current, category],
    );

  const handleSave = async () => {
    setIsSaving(true);
    setStatus(null);
    try {
      await fetchJson<object>(
        "/api/slots/policy",
        jsonInit("PUT", {
          slotId: slot.id,
          blockedCategories: blocked,
          maxProminence: prominencePct / 100,
          requireApproval,
        }),
      );
      reloadWithFlash(`Saved ad policy for "${slot.label}". New renders follow it; re-generate cuts made under the old rules.`);
    } catch (error) {
      setStatus({ tone: "error", text: errorMessage(error, "Could not save the ad policy") });
      setIsSaving(false);
    }
  };

  // Side of a square covering prominencePct of a frame, for the little preview.
  const previewSide = `${Math.sqrt(prominencePct / 100) * 100}%`;

  return (
    <InspectorSection id={`policy-${slot.id}`} title="Ad policy" icon={SlidersHorizontal}>
      <div className="space-y-4">
        <fieldset>
          <legend className="mb-2 flex w-full items-center justify-between text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
            <span>Blocked categories</span>
          </legend>
          <div className="grid grid-cols-2 gap-1.5">
            {AD_CATEGORIES.map((category) => (
              <label
                key={category.value}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[13px] text-slate-300 transition-colors hover:border-white/20 hover:bg-white/[0.06] has-[:checked]:border-red-400/40 has-[:checked]:bg-red-500/10 has-[:checked]:text-red-100 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-amber/60"
              >
                <input
                  type="checkbox"
                  checked={blocked.includes(category.value)}
                  onChange={() => toggleCategory(category.value)}
                  className="size-3.5 shrink-0 cursor-pointer outline-none"
                  style={{ accentColor: AD_ACCENT }}
                />
                <span className="truncate">{category.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <label htmlFor={`prominence-${slot.id}`} className="mb-2 flex justify-between gap-2 text-xs text-muted-foreground">
                <span>Prominence cap (max share of frame)</span>
                <span className="font-mono text-sm font-semibold text-amber tabular-nums">{prominencePct}%</span>
              </label>
              <input
                id={`prominence-${slot.id}`}
                type="range"
                min={MIN_PROMINENCE_PCT}
                max={MAX_PROMINENCE_PCT}
                step={1}
                value={prominencePct}
                onChange={(event) => setProminencePct(Number(event.target.value))}
                className="w-full cursor-pointer"
                style={{ accentColor: AD_ACCENT }}
              />
            </div>
            <div
              aria-hidden="true"
              className="relative grid aspect-video w-16 shrink-0 place-items-center overflow-hidden rounded-md border border-white/15 bg-black/40"
            >
              <div
                className="rounded-[3px] border border-amber/80 bg-amber/30 transition-all duration-200"
                style={{ width: previewSide, height: previewSide }}
              />
            </div>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 transition-colors hover:bg-white/[0.06] has-[:checked]:border-amber/40 has-[:checked]:bg-amber/[0.08] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-amber/60">
          <input
            type="checkbox"
            checked={requireApproval}
            onChange={(event) => setRequireApproval(event.target.checked)}
            className="size-4 shrink-0 cursor-pointer outline-none"
            style={{ accentColor: AD_ACCENT }}
          />
          Require my approval before a cut plays
        </label>

        <StatusMessage status={status} onDismiss={() => setStatus(null)} />

        <Button onClick={handleSave} disabled={isSaving} className="h-10 w-full">
          {isSaving ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
          {isSaving ? "Saving…" : "Save ad policy"}
        </Button>
      </div>
    </InspectorSection>
  );
}
