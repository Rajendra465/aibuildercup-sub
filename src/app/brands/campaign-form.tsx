"use client";

import { type FormEvent, type ReactNode, useEffect, useId, useState } from "react";
import Image from "next/image";
import { AlertCircle, Loader2 } from "lucide-react";
import type { Campaign } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CATEGORIES, CATEGORY_LABELS, errorMessage, fetchJson } from "./campaign-utils";

type FieldName =
  | "brandName" | "productName" | "tagline" | "category" | "landingUrl" | "ctaLabel"
  | "brandColors" | "targetCities" | "targetCountries" | "targetLocales" | "avoidContexts"
  | "flightStart" | "flightEnd" | "seasonLabel" | "bidWeight" | "audioScript" | "logo" | "productImage";

type FieldErrors = Partial<Record<FieldName, string>>;

interface CampaignFormProps {
  onCreated: (campaign: Campaign) => void;
  onCancel: () => void;
}

interface CreateResponse {
  success: boolean;
  campaign?: Campaign;
  error?: string;
}

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const HEX = /^#[0-9a-fA-F]{3,8}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const text = (form: FormData, key: FieldName) => String(form.get(key) ?? "").trim();
const list = (value: string) => value.split(/[\n,]+/).map((entry) => entry.trim()).filter(Boolean);

function validateImage(form: FormData, key: "logo" | "productImage", label: string): string | undefined {
  const file = form.get(key);
  if (!(file instanceof File) || file.size === 0) return undefined;
  if (!IMAGE_TYPES.includes(file.type)) return `${label} must be PNG, JPEG or WebP`;
  if (file.size > MAX_IMAGE_BYTES) return `${label} must be under 5 MB`;
  return undefined;
}

/** Mirrors the server rules in /api/campaigns so most mistakes are caught before upload. */
function validate(form: FormData): FieldErrors {
  const errors: FieldErrors = {};
  if (!text(form, "brandName")) errors.brandName = "Brand name is required";
  if (!text(form, "productName")) errors.productName = "Product name is required";
  if (!text(form, "tagline")) errors.tagline = "Tagline is required";
  if (!CATEGORIES.includes(text(form, "category") as (typeof CATEGORIES)[number])) errors.category = "Pick a valid category";
  if (!/^https?:\/\//.test(text(form, "landingUrl"))) errors.landingUrl = "Landing URL must start with http:// or https://";

  const badColors = list(text(form, "brandColors")).filter((color) => !HEX.test(color));
  if (badColors.length) errors.brandColors = `Not hex colours: ${badColors.join(", ")}`;

  const start = text(form, "flightStart");
  const end = text(form, "flightEnd");
  if (start && !DATE.test(start)) errors.flightStart = "Use YYYY-MM-DD";
  if (end && !DATE.test(end)) errors.flightEnd = "Use YYYY-MM-DD";
  if (start && end && end < start) errors.flightEnd = "Flight must end after it starts";

  const bidRaw = text(form, "bidWeight");
  const bid = Number(bidRaw);
  if (bidRaw && (!Number.isFinite(bid) || bid < 0 || bid > 10)) errors.bidWeight = "Bid weight must be between 0 and 10";

  const logoError = validateImage(form, "logo", "Logo");
  if (logoError) errors.logo = logoError;
  const productError = validateImage(form, "productImage", "Product image");
  if (productError) errors.productImage = productError;
  return errors;
}

/** Attaches a server error string to the field it most likely refers to. */
function fieldForServerError(message: string): FieldName | undefined {
  const lower = message.toLowerCase();
  if (lower.includes("landing url")) return "landingUrl";
  if (lower.includes("category")) return "category";
  if (lower.includes("flight")) return "flightEnd";
  if (lower.startsWith("logo")) return "logo";
  if (lower.startsWith("product must") || lower.startsWith("product image")) return "productImage";
  return undefined;
}

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

function Field({ id, label, error, hint, required, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id} className="text-slate-200">
        {label}
        {required && <span className="text-[#F2A541]" aria-hidden="true">*</span>}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface ImageFieldProps {
  name: "logo" | "productImage";
  label: string;
  error?: string;
}

function ImageField({ name, label, error }: ImageFieldProps) {
  const id = `${useId()}-${name}`;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  return (
    <Field id={id} label={label} error={error} hint="PNG, JPEG or WebP, up to 5 MB">
      <div className="flex items-center gap-3">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-950">
          {previewUrl ? (
            <Image src={previewUrl} alt={`${label} preview`} fill unoptimized sizes="64px" className="object-contain" />
          ) : (
            <span className="flex size-full items-center justify-center text-[10px] text-slate-600">No file</span>
          )}
        </div>
        <Input
          id={id}
          name={name}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
          onChange={(event) => {
            const file = event.target.files?.[0];
            setPreviewUrl(file ? URL.createObjectURL(file) : null);
          }}
        />
      </div>
    </Field>
  );
}

export function CampaignForm({ onCreated, onCancel }: CampaignFormProps) {
  const baseId = useId();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fieldId = (name: FieldName) => `${baseId}-${name}`;
  const inputProps = (name: FieldName) => ({
    id: fieldId(name),
    name,
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `${fieldId(name)}-error` : undefined,
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const clientErrors = validate(form);
    setErrors(clientErrors);
    setFormError(null);
    if (Object.keys(clientErrors).length) {
      setFormError("Please fix the highlighted fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const body = await fetchJson<CreateResponse>("/api/campaigns", { method: "POST", body: form });
      if (!body.campaign) throw new Error("Server did not return the new campaign");
      onCreated(body.campaign);
    } catch (error) {
      const message = errorMessage(error, "Could not save campaign");
      const field = fieldForServerError(message);
      if (field) setErrors({ [field]: message });
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {formError && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {formError}
        </div>
      )}

      <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">Brand &amp; creative</legend>
        <Field id={fieldId("brandName")} label="Brand name" required error={errors.brandName}>
          <Input {...inputProps("brandName")} placeholder="Monsoon Brew" required />
        </Field>
        <Field id={fieldId("productName")} label="Product name" required error={errors.productName}>
          <Input {...inputProps("productName")} placeholder="Masala Cold Coffee" required />
        </Field>
        <Field id={fieldId("tagline")} label="Tagline" required error={errors.tagline} className="sm:col-span-2">
          <Input {...inputProps("tagline")} placeholder="Brewed for the rain." required />
        </Field>
        <Field id={fieldId("category")} label="Category" required error={errors.category}>
          <select
            {...inputProps("category")}
            defaultValue="food_beverage"
            className="h-8 w-full rounded-lg border border-input bg-zinc-900 px-2.5 text-sm text-slate-100 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </Field>
        <Field id={fieldId("brandColors")} label="Brand colours" error={errors.brandColors} hint="Up to 4 hex values, comma separated">
          <Input {...inputProps("brandColors")} placeholder="#1B4D3E, #F2A541" />
        </Field>
        <ImageField name="logo" label="Logo" error={errors.logo} />
        <ImageField name="productImage" label="Product image" error={errors.productImage} />
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">Shoppable pause</legend>
        <Field id={fieldId("landingUrl")} label="Landing URL" required error={errors.landingUrl}>
          <Input {...inputProps("landingUrl")} type="url" placeholder="https://example.com/product" required />
        </Field>
        <Field id={fieldId("ctaLabel")} label="CTA label" error={errors.ctaLabel} hint="Defaults to “Learn more”">
          <Input {...inputProps("ctaLabel")} placeholder="Shop now" />
        </Field>
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">Targeting &amp; safety</legend>
        <Field id={fieldId("targetCities")} label="Target cities" error={errors.targetCities} hint="Comma or newline list; empty = everywhere">
          <Textarea {...inputProps("targetCities")} rows={2} placeholder="Mumbai, Tokyo" />
        </Field>
        <Field id={fieldId("targetCountries")} label="Target countries" error={errors.targetCountries} hint="Empty = everywhere">
          <Textarea {...inputProps("targetCountries")} rows={2} placeholder="India, Japan" />
        </Field>
        <Field id={fieldId("targetLocales")} label="Target locales" error={errors.targetLocales} hint="e.g. hi-IN, ja-JP">
          <Textarea {...inputProps("targetLocales")} rows={2} placeholder="hi-IN, ja-JP" />
        </Field>
        <Field id={fieldId("avoidContexts")} label="Avoid contexts" error={errors.avoidContexts} hint="Scenes the brand must never appear in">
          <Textarea {...inputProps("avoidContexts")} rows={2} placeholder="violence, drinking" />
        </Field>
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <legend className="mb-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">Flight &amp; bidding</legend>
        <Field id={fieldId("flightStart")} label="Flight start" error={errors.flightStart}>
          <Input {...inputProps("flightStart")} type="date" />
        </Field>
        <Field id={fieldId("flightEnd")} label="Flight end" error={errors.flightEnd}>
          <Input {...inputProps("flightEnd")} type="date" />
        </Field>
        <Field id={fieldId("seasonLabel")} label="Season label" error={errors.seasonLabel}>
          <Input {...inputProps("seasonLabel")} placeholder="Diwali" />
        </Field>
        <Field id={fieldId("bidWeight")} label="Bid weight (0–10)" error={errors.bidWeight} hint="Higher wins ties">
          <Input {...inputProps("bidWeight")} type="number" min={0} max={10} step={0.5} defaultValue={1} />
        </Field>
        <Field id={fieldId("audioScript")} label="Audio ad script" error={errors.audioScript} hint="Optional line read inside the scene" className="sm:col-span-2">
          <Textarea {...inputProps("audioScript")} rows={2} placeholder="Nothing beats the rain like a Monsoon Brew." />
        </Field>
      </fieldset>

      <div className="flex flex-col-reverse gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="bg-[#F2A541] text-black hover:bg-[#e0922c]">
          {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
          {isSubmitting ? "Saving…" : "Create campaign"}
        </Button>
      </div>
    </form>
  );
}
