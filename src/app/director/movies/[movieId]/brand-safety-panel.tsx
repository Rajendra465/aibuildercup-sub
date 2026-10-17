"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import type { SceneSafetyProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { errorMessage, fetchJson, jsonInit } from "./director-api";
import { StatusMessage, type Status } from "./status-message";
import { InspectorSection } from "./inspector-section";
import { Shimmer } from "./shimmer";

interface BrandSafetyPanelProps {
  movieId: string;
  slotId: string;
}

interface ScenesResponse {
  scenes: SceneSafetyProfile[];
}

interface SceneResponse {
  scene: SceneSafetyProfile;
}

export function BrandSafetyPanel({ movieId, slotId }: BrandSafetyPanelProps) {
  const [scene, setScene] = useState<SceneSafetyProfile | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchJson<ScenesResponse>(`/api/ads/scene?movieId=${encodeURIComponent(movieId)}`)
      .then((data) => {
        if (cancelled) return;
        setScene(data.scenes.find((entry) => entry.slotId === slotId) ?? null);
        setStatus(null);
      })
      .catch((error: unknown) => {
        if (!cancelled) setStatus({ tone: "error", text: errorMessage(error, "Could not load the scene profile") });
      });
    return () => {
      cancelled = true;
    };
  }, [movieId, slotId]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setStatus({ tone: "info", text: "Gemini is reviewing the clip for brand-safety risks…" });
    try {
      const data = await fetchJson<SceneResponse>("/api/ads/scene", jsonInit("POST", { slotId, force: true }));
      setScene(data.scene);
      setStatus(
        data.scene.source === "gemini"
          ? { tone: "success", text: "Scene analyzed with Gemini." }
          : { tone: "info", text: "Gemini was unavailable or the clip is not exported yet, so this is estimated from your notes." },
      );
    } catch (error) {
      setStatus({ tone: "error", text: errorMessage(error, "Scene analysis failed") });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const showSkeleton = isAnalyzing || (!scene && !status);

  return (
    <InspectorSection id={`safety-${slotId}`} title="Brand safety" icon={ShieldCheck}>
      <div className="space-y-3">
        <Button
          variant="outline"
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className={cn("h-9 w-full", isAnalyzing && "shimmer-bg animate-shimmer")}
        >
          {isAnalyzing ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4 text-violet-300" aria-hidden />}
          {isAnalyzing ? "Analyzing…" : "Analyze scene with Gemini"}
        </Button>
        <StatusMessage status={status} onDismiss={isAnalyzing ? undefined : () => setStatus(null)} />
        {showSkeleton ? (
          <div className="space-y-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <span className="sr-only">{isAnalyzing ? "Analyzing scene…" : "Loading scene profile…"}</span>
            <div className="flex gap-2">
              <Shimmer className="h-5 w-24 rounded-full" />
              <Shimmer className="h-5 w-16 rounded-full" />
            </div>
            <Shimmer className="h-3 w-full" />
            <Shimmer className="h-3 w-4/5" />
            <div className="flex gap-1.5 pt-1">
              <Shimmer className="h-5 w-14 rounded-full" />
              <Shimmer className="h-5 w-20 rounded-full" />
              <Shimmer className="h-5 w-12 rounded-full" />
            </div>
          </div>
        ) : (
          scene && <SceneCard scene={scene} />
        )}
      </div>
    </InspectorSection>
  );
}

function SceneCard({ scene }: { scene: SceneSafetyProfile }) {
  const isGemini = scene.source === "gemini";
  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-0.5 text-xs capitalize text-white">
          Mood: {scene.mood}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs",
            isGemini ? "border-violet/40 bg-violet/15 text-violet-100" : "border-amber/40 bg-amber/10 text-amber",
          )}
        >
          {isGemini && <Sparkles className="size-3" aria-hidden />}
          {isGemini ? "Gemini" : "Heuristic"}
        </span>
      </div>
      {scene.summary && <p className="leading-relaxed text-slate-200">{scene.summary}</p>}
      <TagList label="Themes" items={scene.themes} empty="None recorded" className="border-white/15 bg-white/[0.05] text-slate-200" />
      <TagList
        label="Sensitive contexts"
        items={scene.sensitiveContexts}
        empty="None found"
        className="border-red-400/35 bg-red-500/10 text-red-200"
      />
    </div>
  );
}

interface TagListProps {
  label: string;
  items: string[];
  empty: string;
  className: string;
}

function TagList({ label, items, empty, className }: TagListProps) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">{label}</div>
      {items.length ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span key={item} className={cn("rounded-full border px-2 py-0.5 text-xs", className)}>
              {item}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-xs text-muted-foreground/70">{empty}</span>
      )}
    </div>
  );
}
