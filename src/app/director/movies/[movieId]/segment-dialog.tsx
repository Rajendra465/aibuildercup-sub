"use client";

import { useState, type FormEvent } from "react";
import { Clock, LoaderCircle, Plus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { errorMessage, fetchJson, jsonInit, reloadWithFlash } from "./director-api";
import { StatusMessage, type Status } from "./status-message";

interface SegmentDialogProps {
  movieId: string;
  /** Playhead position, used by the "Use Current" buttons. */
  currentTime: number;
}

const FIELD = "h-9 bg-white/[0.04]";

export function SegmentDialog({ movieId, currentTime }: SegmentDialogProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSegment, setNewSegment] = useState({
    label: "",
    type: "LOCALIZED_PROP",
    startSeconds: 0,
    endSeconds: 5,
    narrativePurpose: "",
    editableFields: "",
    immutableFacts: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [segmentStatus, setSegmentStatus] = useState<Status | null>(null);

  const handleSaveSegment = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSegmentStatus(null);
    try {
      // Saving rewrites seed.ts; reload so Next re-evaluates it.
      await fetchJson<object>(
        "/api/segments",
        jsonInit("POST", {
          ...newSegment,
          movieId,
          editableFields: newSegment.editableFields.split(",").map((s) => s.trim()).filter(Boolean),
          immutableFacts: newSegment.immutableFacts.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      );
      reloadWithFlash(`Segment "${newSegment.label}" added. Click "Export Fallback Segments" to cut its clip.`);
    } catch (error) {
      setSegmentStatus({ tone: "error", text: errorMessage(error, "Error saving segment") });
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger className={cn(buttonVariants({ variant: "outline" }), "h-10 px-4")}>
        <Plus className="size-4" aria-hidden />
        Add Segment
      </DialogTrigger>
      <DialogContent className="glass-strong max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl bg-transparent p-5 text-slate-200 ring-white/10 sm:max-w-xl sm:p-6">
        <DialogHeader>
          <p className="text-[10px] font-semibold tracking-[0.3em] text-amber uppercase">New segment</p>
          <DialogTitle className="text-xl font-semibold text-white">Add New Adaptive Segment</DialogTitle>
          <DialogDescription>
            Mark a window of the film that can adapt per viewer. Use the playhead to set its in and out points.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSaveSegment} className="mt-2 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="label">Segment Label</Label>
              <Input id="label" required className={FIELD} value={newSegment.label} onChange={(e) => setNewSegment({ ...newSegment, label: e.target.value })} placeholder="e.g. Hero Close-up" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                className="flex h-9 w-full cursor-pointer rounded-lg border border-input bg-white/[0.04] px-2.5 text-sm text-white outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 [&>option]:bg-night"
                value={newSegment.type}
                onChange={(e) => setNewSegment({ ...newSegment, type: e.target.value })}
              >
                <option value="CITY_ESTABLISHING">City Establishing</option>
                <option value="LOCALIZED_PROP">Localized Prop</option>
                <option value="DIEGETIC_SCREEN">Diegetic Screen</option>
                <option value="ADSPOT_BILLBOARD">Adspots / Billboards</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start">Start (seconds)</Label>
              <div className="flex gap-2">
                <Input id="start" type="number" required min="0" step="0.001" className={cn(FIELD, "flex-1 font-mono")} value={newSegment.startSeconds} onChange={(e) => setNewSegment({ ...newSegment, startSeconds: Number(e.target.value) })} />
                <Button type="button" variant="outline" className="h-9" onClick={() => setNewSegment({ ...newSegment, startSeconds: Number(currentTime.toFixed(3)) })}>
                  <Clock className="size-3.5" aria-hidden />
                  Use Current
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">End (seconds)</Label>
              <div className="flex gap-2">
                <Input id="end" type="number" required min="0" step="0.001" className={cn(FIELD, "flex-1 font-mono")} value={newSegment.endSeconds} onChange={(e) => setNewSegment({ ...newSegment, endSeconds: Number(e.target.value) })} />
                <Button type="button" variant="outline" className="h-9" onClick={() => setNewSegment({ ...newSegment, endSeconds: Number(currentTime.toFixed(3)) })}>
                  <Clock className="size-3.5" aria-hidden />
                  Use Current
                </Button>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="purpose">Narrative Purpose</Label>
            <Textarea id="purpose" required className="bg-white/[0.04]" value={newSegment.narrativePurpose} onChange={(e) => setNewSegment({ ...newSegment, narrativePurpose: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="editable">Editable Fields (comma separated)</Label>
              <Input id="editable" className={FIELD} value={newSegment.editableFields} onChange={(e) => setNewSegment({ ...newSegment, editableFields: e.target.value })} placeholder="e.g. language, city name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="immutable">Immutable Facts (comma separated)</Label>
              <Input id="immutable" className={FIELD} value={newSegment.immutableFacts} onChange={(e) => setNewSegment({ ...newSegment, immutableFacts: e.target.value })} placeholder="e.g. Nighttime, Raining" />
            </div>
          </div>
          <StatusMessage status={segmentStatus} onDismiss={() => setSegmentStatus(null)} />
          <Button type="submit" disabled={isSaving} className="mt-2 h-10 w-full">
            {isSaving && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            {isSaving ? "Saving..." : "Save Segment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
