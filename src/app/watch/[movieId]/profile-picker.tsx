import Link from "next/link";
import { ArrowLeft, Globe2, MapPin } from "lucide-react";
import { AdPreference, Movie, ViewerProfile } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { FadeIn, Stagger, StaggerItem } from "@/components/fx/motion";
import { CustomProfileForm } from "./custom-profile-form";

interface ProfilePickerProps {
  movie: Movie;
  profiles: ViewerProfile[];
  date: string | null;
}

const AD_PREFERENCE_BADGES: Record<Exclude<AdPreference, "standard">, { label: string; className: string }> = {
  kids: { label: "Kids · PSA only", className: "border-azure/40 bg-azure/10 text-sky-300" },
  ad_free: { label: "Ad-free", className: "border-mint/40 bg-mint/10 text-mint" },
};

const AVATAR_GRADIENTS = [
  "from-[#ffbe5c] to-[#e0922c]",
  "from-[#a78bfa] to-[#6d28d9]",
  "from-[#60a5fa] to-[#3b6bff]",
  "from-[#6ee7b7] to-[#059669]",
  "from-[#f9a8d4] to-[#db2777]",
  "from-[#fcd34d] to-[#8b5cf6]",
] as const;

const CHIP_BASE = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap";

function initialsFor(name: string): string {
  const parts = name
    .replace(/\(.*?\)/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2);
  return letters.toUpperCase() || "?";
}

function AdPreferenceBadge({ preference }: { preference?: AdPreference }) {
  if (!preference || preference === "standard") return null;
  const badge = AD_PREFERENCE_BADGES[preference];
  return <span className={`${CHIP_BASE} ${badge.className}`}>{badge.label}</span>;
}

function watchHref(movieId: string, profileId: string, date: string | null): string {
  const params = new URLSearchParams({ profile: profileId });
  if (date) params.set("date", date);
  return `/watch/${movieId}?${params.toString()}`;
}

function ProfileTile({ profile, href, gradient }: { profile: ViewerProfile; href: string; gradient: string }) {
  return (
    <div className="group/profile glass flex h-full flex-col items-center gap-4 rounded-3xl p-6 text-center transition-all duration-300 hover:-translate-y-1.5 hover:border-amber/40 hover:shadow-[0_0_0_1px_rgb(242_165_65/0.3),0_28px_60px_-20px_rgb(242_165_65/0.45)] focus-within:border-amber/50">
      <div className="relative">
        <div
          aria-hidden="true"
          className={`absolute -inset-3 rounded-full bg-gradient-to-br ${gradient} opacity-0 blur-2xl transition-opacity duration-500 group-hover/profile:opacity-50`}
        />
        <div
          aria-hidden="true"
          className={`relative flex size-24 items-center justify-center rounded-full bg-gradient-to-br ${gradient} font-display text-3xl font-bold text-ink shadow-[inset_0_2px_0_rgb(255_255_255/0.35)] ring-2 ring-white/15 transition-transform duration-300 group-hover/profile:scale-105 sm:size-28`}
        >
          {initialsFor(profile.displayName)}
        </div>
      </div>

      <div className="min-w-0">
        <h2 className="truncate text-xl font-semibold text-white">{profile.displayName}</h2>
        <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5" aria-hidden="true" />
          {profile.city}, {profile.country}
        </p>
        <p className="mt-0.5 inline-flex items-center gap-1 text-sm text-muted-foreground">
          <Globe2 className="size-3.5" aria-hidden="true" />
          {profile.languageLabel}
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-1.5">
        <AdPreferenceBadge preference={profile.adPreference} />
        <span className={`${CHIP_BASE} border-white/15 bg-white/5 font-mono text-white/80`}>{profile.locale}</span>
        {profile.culturalContext?.map((ctx) => (
          <span key={ctx} className={`${CHIP_BASE} border-violet/30 bg-violet/10 text-violet-200`}>
            {ctx}
          </span>
        ))}
      </div>

      <Link href={href} className={buttonVariants({ className: "mt-auto h-10 w-full" })}>
        Watch this cut
      </Link>
    </div>
  );
}

/** "Who is watching?" screen for a movie. */
export function ProfilePicker({ movie, profiles, date }: ProfilePickerProps) {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-4 py-10 sm:px-8 sm:py-14">
      <FadeIn className="text-center">
        <Link
          href="/watch"
          className="mb-6 inline-flex items-center gap-1.5 rounded-lg text-sm text-muted-foreground transition-colors hover:text-white focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Projects
        </Link>
        <p className="mb-3 text-xs font-semibold tracking-[0.3em] text-amber uppercase">{movie.title}</p>
        <h1 className="text-4xl font-bold text-white sm:text-6xl">Who is watching?</h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Select a viewer profile for {movie.title}. Each one gets its own InScene cut.
        </p>
        {date && (
          <p className="mt-3 inline-flex rounded-full border border-amber/40 bg-amber/10 px-3 py-1 text-xs text-amber">
            Simulated date: {date}
          </p>
        )}
      </FadeIn>

      <Stagger className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" gap={0.08}>
        {profiles.map((candidate, index) => (
          <StaggerItem key={candidate.id} className="h-full">
            <ProfileTile
              profile={candidate}
              href={watchHref(movie.id, candidate.id, date)}
              gradient={AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length]}
            />
          </StaggerItem>
        ))}
      </Stagger>

      <FadeIn>
        <CustomProfileForm movieId={movie.id} />
      </FadeIn>
    </main>
  );
}
