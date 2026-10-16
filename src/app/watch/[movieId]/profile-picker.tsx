import Link from "next/link";
import { AdPreference, Movie, ViewerProfile } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CustomProfileForm } from "./custom-profile-form";

interface ProfilePickerProps {
  movie: Movie;
  profiles: ViewerProfile[];
  date: string | null;
}

const AD_PREFERENCE_BADGES: Record<Exclude<AdPreference, "standard">, { label: string; className: string }> = {
  kids: { label: "Kids · PSA only", className: "border-sky-800 text-sky-300" },
  ad_free: { label: "Ad-free", className: "border-emerald-800 text-emerald-300" },
};

function AdPreferenceBadge({ preference }: { preference?: AdPreference }) {
  if (!preference || preference === "standard") return null;
  const badge = AD_PREFERENCE_BADGES[preference];
  return (
    <Badge variant="outline" className={badge.className}>
      {badge.label}
    </Badge>
  );
}

function watchHref(movieId: string, profileId: string, date: string | null): string {
  const params = new URLSearchParams({ profile: profileId });
  if (date) params.set("date", date);
  return `/watch/${movieId}?${params.toString()}`;
}

/** "Who is watching?" screen for a movie. */
export function ProfilePicker({ movie, profiles, date }: ProfilePickerProps) {
  return (
    <main className="min-h-screen p-8 max-w-5xl mx-auto flex flex-col gap-10">
      <div className="text-center">
        <Link href="/watch" className="text-indigo-400 hover:text-indigo-300 text-sm mb-4 inline-block">
          &larr; Back to Projects
        </Link>
        <h1 className="text-4xl font-bold tracking-tight">Who is watching?</h1>
        <p className="text-slate-400 mt-2">Select a viewer profile for {movie.title}. Each one gets its own InScene cut.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {profiles.map((candidate) => (
          <Card key={candidate.id} className="bg-zinc-900 border-zinc-800 flex flex-col">
            <div className="p-6 flex-1">
              <div className="text-2xl font-semibold text-slate-100 flex items-center justify-between gap-3">
                <span className="truncate">{candidate.displayName}</span>
                <span className="text-sm text-slate-500 shrink-0">{candidate.country}</span>
              </div>
              <div className="mt-5 flex flex-col gap-2 text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 w-20">City</span>
                  <span className="font-medium text-slate-200">{candidate.city}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 w-20">Language</span>
                  <span className="font-medium text-slate-200">{candidate.languageLabel}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <AdPreferenceBadge preference={candidate.adPreference} />
                  <Badge variant="outline" className="border-zinc-700">{candidate.locale}</Badge>
                  {candidate.culturalContext?.map((ctx) => (
                    <Badge key={ctx} variant="secondary" className="bg-zinc-800 text-slate-400">{ctx}</Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 pt-0">
              <Link href={watchHref(movie.id, candidate.id, date)} className={buttonVariants({ className: "w-full rounded" })}>
                Watch this cut
              </Link>
            </div>
          </Card>
        ))}
      </div>

      <CustomProfileForm movieId={movie.id} />
    </main>
  );
}
