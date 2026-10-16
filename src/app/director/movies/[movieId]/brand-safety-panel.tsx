"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import type { SceneSafetyProfile } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AD_ACCENT, errorMessage, fetchJson, jsonInit } from "./director-api";
import { StatusMessage, type Status } from "./status-message";

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

  return (
    <section className="space-y-2" aria-labelledby={`safety-${slotId}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 id={`safety-${slotId}`} className="flex items-center gap-2 font-semibold text-slate-100">
          <ShieldCheck className="size-4" style={{ color: AD_ACCENT }} aria-hidden />
          Brand safety
        </h3>
        <Button size="sm" variant="outline" onClick={handleAnalyze} disabled={isAnalyzing} className="border-zinc-700 hover:bg-zinc-800">
          {isAnalyzing && <LoaderCircle className="size-3 animate-spin" aria-hidden />}
          {isAnalyzing ? "Analyzing…" : "Analyze scene with Gemini"}
        </Button>
      </div>
      <StatusMessage status={status} onDismiss={isAnalyzing ? undefined : () => setStatus(null)} />
      {scene ? (
        <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-zinc-700 capitalize text-slate-200">Mood: {scene.mood}</Badge>
            <Badge
              variant="outline"
              className={scene.source === "gemini" ? "border-emerald-800 text-emerald-300" : "border-amber-700 text-amber-300"}
            >
              {scene.source === "gemini" ? "Gemini" : "Heuristic"}
            </Badge>
          </div>
          {scene.summary && <p className="text-slate-300">{scene.summary}</p>}
          <TagList label="Themes" items={scene.themes} empty="None recorded" className="border-zinc-700 text-slate-300" />
          <TagList
            label="Sensitive contexts"
            items={scene.sensitiveContexts}
            empty="None found"
            className="border-red-900 text-red-300"
          />
        </div>
      ) : (
        !status && <p className="text-zinc-500">Loading scene profile…</p>
      )}
    </section>
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
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      {items.length ? (
        <div className="flex flex-wrap gap-1">
          {items.map((item) => (
            <Badge key={item} variant="outline" className={className}>{item}</Badge>
          ))}
        </div>
      ) : (
        <span className="text-xs text-zinc-500">{empty}</span>
      )}
    </div>
  );
}
