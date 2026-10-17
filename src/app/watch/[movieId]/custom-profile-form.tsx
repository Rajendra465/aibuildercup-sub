"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AdPreference, ViewerProfile } from "@/lib/types";
import { Sparkles, UserPlus } from "lucide-react";

type ProfileResponse = {
  success: boolean;
  profile?: ViewerProfile;
  error?: string;
};

interface CustomProfileFormProps {
  movieId: string;
}

const AD_PREFERENCE_OPTIONS: { value: AdPreference; label: string }[] = [
  { value: "standard", label: "Standard — brand placements" },
  { value: "ad_free", label: "Ad-free — neutral artwork" },
  { value: "kids", label: "Kids — public-service only" },
];

const FIELD_CLASS = "h-10 rounded-xl border-white/12 bg-white/5 px-3 focus-visible:border-amber/60 focus-visible:ring-amber/25";

function parseAdPreference(value: FormDataEntryValue | null): AdPreference {
  return AD_PREFERENCE_OPTIONS.find((option) => option.value === value)?.value ?? "standard";
}

export function CustomProfileForm({ movieId }: CustomProfileFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      displayName: String(formData.get("displayName") || ""),
      city: String(formData.get("city") || ""),
      country: String(formData.get("country") || ""),
      locale: String(formData.get("locale") || ""),
      languageLabel: String(formData.get("languageLabel") || ""),
      culturalContext: String(formData.get("culturalContext") || ""),
      adPreference: parseAdPreference(formData.get("adPreference")),
    };

    try {
      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as ProfileResponse;
      if (!data.success || !data.profile) throw new Error(data.error || "Failed to create profile");
      router.refresh();
      router.push(`/watch/${movieId}?profile=${data.profile.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to create profile");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-strong relative flex flex-col gap-6 overflow-hidden rounded-3xl p-6 sm:p-8"
      aria-labelledby="custom-profile-heading"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-violet/25 blur-3xl" />
      <div className="relative flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-amber/30 bg-amber/10 text-amber">
          <UserPlus className="size-5" aria-hidden="true" />
        </div>
        <div>
          <h2 id="custom-profile-heading" className="text-xl font-semibold text-white">Create Custom Profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">Use declared viewer location and language for personalization.</p>
        </div>
      </div>

      <div className="relative grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="displayName" className="text-white/80">Name</Label>
          <Input id="displayName" name="displayName" placeholder="Sampath" required className={FIELD_CLASS} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="city" className="text-white/80">City</Label>
          <Input id="city" name="city" placeholder="Visakhapatnam" required className={FIELD_CLASS} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="country" className="text-white/80">Country</Label>
          <Input id="country" name="country" placeholder="India" required className={FIELD_CLASS} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="locale" className="text-white/80">Locale</Label>
          <Input id="locale" name="locale" placeholder="te-IN" required className={FIELD_CLASS} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="languageLabel" className="text-white/80">Language</Label>
          <Input id="languageLabel" name="languageLabel" placeholder="Telugu" required className={FIELD_CLASS} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="adPreference" className="text-white/80">Ads</Label>
          <select
            id="adPreference"
            name="adPreference"
            defaultValue="standard"
            className="h-10 w-full rounded-xl border border-white/12 bg-white/5 px-3 text-sm text-white outline-none transition-colors focus-visible:border-amber/60 focus-visible:ring-3 focus-visible:ring-amber/25 [&>option]:bg-night"
          >
            {AD_PREFERENCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="culturalContext" className="text-white/80">Cultural context</Label>
          <Textarea
            id="culturalContext"
            name="culturalContext"
            placeholder="coastal city, India"
            className="rounded-xl border-white/12 bg-white/5 px-3 focus-visible:border-amber/60 focus-visible:ring-amber/25"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="relative rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}
      <Button type="submit" className="relative h-10 self-start px-5" disabled={isSubmitting}>
        <Sparkles aria-hidden="true" />
        {isSubmitting ? "Creating..." : "Create and watch"}
      </Button>
    </form>
  );
}
