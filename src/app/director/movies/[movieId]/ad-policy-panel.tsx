"use client";

import { useState } from "react";
import { LoaderCircle, SlidersHorizontal } from "lucide-react";
import type { AdCategory, AdaptiveSlot } from "@/lib/types";
import { policyForSlot } from "@/lib/ads/brand-safety";
import { Button } from "@/components/ui/button";
import { AD_ACCENT, AD_CATEGORIES, errorMessage, fetchJson, jsonInit, reloadWithFlash } from "./director-api";
import { StatusMessage, type Status } from "./status-message";

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

  return (
    <section className="space-y-3" aria-labelledby={`policy-${slot.id}`}>
      <h3 id={`policy-${slot.id}`} className="flex items-center gap-2 font-semibold text-slate-100">
        <SlidersHorizontal className="size-4" style={{ color: AD_ACCENT }} aria-hidden />
        Ad policy
      </h3>

      <fieldset>
        <legend className="text-xs text-slate-400 mb-1">Blocked categories</legend>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {AD_CATEGORIES.map((category) => (
            <label key={category.value} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={blocked.includes(category.value)}
                onChange={() => toggleCategory(category.value)}
                style={{ accentColor: AD_ACCENT }}
              />
              {category.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor={`prominence-${slot.id}`} className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Prominence cap (max share of frame)</span>
          <span className="font-mono text-slate-200">{prominencePct}%</span>
        </label>
        <input
          id={`prominence-${slot.id}`}
          type="range"
          min={MIN_PROMINENCE_PCT}
          max={MAX_PROMINENCE_PCT}
          step={1}
          value={prominencePct}
          onChange={(event) => setProminencePct(Number(event.target.value))}
          className="w-full"
          style={{ accentColor: AD_ACCENT }}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
        <input
          type="checkbox"
          checked={requireApproval}
          onChange={(event) => setRequireApproval(event.target.checked)}
          style={{ accentColor: AD_ACCENT }}
        />
        Require my approval before a cut plays
      </label>

      <StatusMessage status={status} onDismiss={() => setStatus(null)} />

      <Button onClick={handleSave} disabled={isSaving} className="w-full text-zinc-950 hover:opacity-90" style={{ backgroundColor: AD_ACCENT }}>
        {isSaving && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
        {isSaving ? "Saving…" : "Save ad policy"}
      </Button>
    </section>
  );
}
