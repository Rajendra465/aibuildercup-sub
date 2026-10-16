"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AdPreference, ViewerProfile } from "@/lib/types";

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
    <form onSubmit={handleSubmit} className="border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">Create Custom Profile</h2>
        <p className="text-sm text-slate-400 mt-1">Use declared viewer location and language for personalization.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="displayName">Name</Label>
          <Input id="displayName" name="displayName" placeholder="Sampath" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" placeholder="Visakhapatnam" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="country">Country</Label>
          <Input id="country" name="country" placeholder="India" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="locale">Locale</Label>
          <Input id="locale" name="locale" placeholder="te-IN" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="languageLabel">Language</Label>
          <Input id="languageLabel" name="languageLabel" placeholder="Telugu" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="adPreference">Ads</Label>
          <select
            id="adPreference"
            name="adPreference"
            defaultValue="standard"
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-slate-200 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 [&>option]:bg-zinc-900"
          >
            {AD_PREFERENCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="culturalContext">Cultural context</Label>
          <Textarea id="culturalContext" name="culturalContext" placeholder="coastal city, India" />
        </div>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}
      <Button type="submit" className="rounded self-start" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create and watch"}
      </Button>
    </form>
  );
}
