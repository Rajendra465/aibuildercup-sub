"use client";

import { type ReactNode, useEffect, useId, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ImagePlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Shared look for text inputs, textareas and selects inside the brief dialog. */
export const CONTROL_CLASS =
  "border-white/12 bg-white/[0.04] text-slate-100 placeholder:text-slate-500 transition-[border-color,box-shadow,background-color] hover:border-white/20 focus-visible:border-amber/60 focus-visible:bg-white/[0.06] focus-visible:ring-amber/25";

export const SELECT_CLASS = cn(
  "h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3 aria-invalid:border-destructive",
  CONTROL_CLASS,
);

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export function Field({ id, label, error, hint, required, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id} className="text-[13px] text-slate-200">
        {label}
        {required && <span className="text-amber" aria-hidden="true">*</span>}
      </Label>
      {children}
      <div className="min-h-4">
        <AnimatePresence mode="wait" initial={false}>
          {error ? (
            <motion.p
              key="error"
              id={`${id}-error`}
              role="alert"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0, x: [0, -3, 3, -2, 0] }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-1 text-xs text-red-300"
            >
              <AlertCircle className="size-3 shrink-0" aria-hidden="true" />
              {error}
            </motion.p>
          ) : hint ? (
            <motion.p
              key="hint"
              id={`${id}-hint`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-xs text-slate-500"
            >
              {hint}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface FormSectionProps {
  step: number;
  title: string;
  description: string;
  columns?: 2 | 3;
  children: ReactNode;
}

/** Numbered, step-like group of fields. Keeps the native fieldset/legend semantics. */
export function FormSection({ step, title, description, columns = 2, children }: FormSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.05 * step, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5"
    >
      <fieldset className={cn("grid grid-cols-1 gap-x-4 gap-y-2", columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        <legend className="mb-4 flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-amber/40 bg-amber/10 font-display text-xs font-semibold text-amber tabular-nums"
          >
            {String(step).padStart(2, "0")}
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-semibold text-white">{title}</span>
            <span className="text-xs text-muted-foreground">{description}</span>
          </span>
        </legend>
        {children}
      </fieldset>
    </motion.section>
  );
}

interface ImageFieldProps {
  name: "logo" | "productImage";
  label: string;
  error?: string;
}

export function ImageField({ name, label, error }: ImageFieldProps) {
  const id = `${useId()}-${name}`;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  return (
    <Field id={id} label={label} error={error} hint="PNG, JPEG or WebP, up to 5 MB">
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border border-dashed p-2 transition-colors",
          error ? "border-red-400/50 bg-red-500/5" : "border-white/15 bg-white/[0.03] hover:border-amber/40",
        )}
      >
        <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[radial-gradient(circle_at_30%_20%,rgb(242_165_65/0.18),transparent_70%)] bg-ink/60">
          <AnimatePresence mode="wait" initial={false}>
            {previewUrl ? (
              <motion.div
                key={previewUrl}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0"
              >
                <Image src={previewUrl} alt={`${label} preview`} fill unoptimized sizes="64px" className="object-contain p-1" />
              </motion.div>
            ) : (
              <motion.span
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex size-full flex-col items-center justify-center gap-0.5 text-[10px] text-slate-500"
              >
                <ImagePlus className="size-4" aria-hidden="true" />
                No file
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="min-w-0 flex-1">
          <Input
            id={id}
            name={name}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : `${id}-hint`}
            className="h-auto cursor-pointer border-0 bg-transparent px-0 py-0 text-xs text-slate-400 file:mr-3 file:h-7 file:cursor-pointer file:rounded-lg file:border file:border-amber/40 file:bg-amber/10 file:px-3 file:text-xs file:text-amber file:transition-colors hover:file:bg-amber/20 focus-visible:ring-amber/30 dark:bg-transparent"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setPreviewUrl(file ? URL.createObjectURL(file) : null);
            }}
          />
        </div>
      </div>
    </Field>
  );
}
