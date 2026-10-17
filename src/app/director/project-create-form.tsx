"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { FileVideo, LoaderCircle, Upload, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const BYTES_PER_MB = 1024 * 1024;

export function ProjectCreateForm() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<{ name: string; sizeMb: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/projects", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Project create failed");
      }

      router.push(`/director/movies/${data.movie.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Project create failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setIsDragging(false);
    setVideoFile(file ? { name: file.name, sizeMb: (file.size / BYTES_PER_MB).toFixed(1) } : null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Project Title</Label>
        <Input id="title" name="title" required className="h-10 bg-white/[0.04]" placeholder="e.g. Night Market — Director's cut" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" className="min-h-20 bg-white/[0.04]" placeholder="A line or two about the film" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="video">Canonical Video</Label>
        <div
          className={cn(
            "relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-7 text-center transition-all",
            "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
            isDragging
              ? "border-amber bg-amber/10 shadow-[0_0_40px_-10px_rgb(242_165_65/0.7)]"
              : videoFile
                ? "border-mint/50 bg-mint/[0.06]"
                : "border-white/15 bg-white/[0.03] hover:border-amber/50 hover:bg-white/[0.05]",
          )}
        >
          <input
            id="video"
            name="video"
            type="file"
            accept="video/*"
            required
            onChange={handleFileChange}
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
            onDrop={() => setIsDragging(false)}
            aria-describedby="video-hint"
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
          <span
            className={cn(
              "grid size-11 place-items-center rounded-xl ring-1 transition-colors",
              videoFile ? "bg-mint/10 text-mint ring-mint/30" : "bg-amber/10 text-amber ring-amber/30",
            )}
            aria-hidden="true"
          >
            {videoFile ? <FileVideo className="size-5" /> : <UploadCloud className={cn("size-5", isDragging && "animate-bounce")} />}
          </span>
          {videoFile ? (
            <span className="max-w-full truncate text-sm font-medium text-white">{videoFile.name}</span>
          ) : (
            <span className="text-sm font-medium text-white">
              Drop your film here or <span className="text-amber underline underline-offset-4">browse</span>
            </span>
          )}
          <span id="video-hint" className="text-xs text-muted-foreground">
            {videoFile ? `${videoFile.sizeMb} MB · click to replace` : "MP4, MOV or WebM — the canonical cut viewers will watch"}
          </span>
        </div>
      </div>
      {error && (
        <p role="alert" className="rounded-xl border border-red-400/35 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}
      <Button type="submit" disabled={isSaving} className="h-11 w-full text-sm">
        {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}
        {isSaving ? "Creating..." : "Create Project"}
      </Button>
    </form>
  );
}
