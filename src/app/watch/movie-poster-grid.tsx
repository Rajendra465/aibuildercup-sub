import Link from "next/link";
import { Clock, Film } from "lucide-react";
import { Movie } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { Stagger, StaggerItem, TiltCard } from "@/components/fx/motion";

interface MoviePosterGridProps {
  movies: Movie[];
  hrefFor: (movieId: string) => string;
  ctaLabel: string;
}

const STATUS_CHIP: Record<Movie["status"], string> = {
  ready: "border-mint/40 bg-mint/10 text-mint",
  draft: "border-amber/40 bg-amber/10 text-amber",
  archived: "border-white/15 bg-white/5 text-muted-foreground",
};

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return minutes > 0 ? `${minutes}m ${seconds.toString().padStart(2, "0")}s` : `${seconds}s`;
}

function PosterArt({ movie }: { movie: Movie }) {
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-t-3xl bg-ink">
      {movie.posterUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- poster assets are arbitrary remote/generated URLs
        <img
          src={movie.posterUrl}
          alt=""
          className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover/poster:scale-105"
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgb(242_165_65/0.45),transparent_55%),radial-gradient(circle_at_85%_75%,rgb(139_92_246/0.5),transparent_55%),linear-gradient(160deg,#0d1130,#070a1c)] transition-transform duration-700 group-hover/poster:scale-105"
        >
          <span className="absolute inset-0 flex items-center justify-center font-display text-7xl font-bold text-white/15">
            {movie.title.charAt(0)}
          </span>
        </div>
      )}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
      <span
        className={`absolute top-4 left-4 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase backdrop-blur-md ${STATUS_CHIP[movie.status]}`}
      >
        {movie.status}
      </span>
      <span className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/40 px-2.5 py-0.5 text-[11px] text-white/80 backdrop-blur-md">
        <Clock className="size-3" aria-hidden="true" />
        {formatDuration(movie.durationSeconds)}
      </span>
    </div>
  );
}

/** Staggered grid of glass movie posters with pointer tilt and hover glow. */
export function MoviePosterGrid({ movies, hrefFor, ctaLabel }: MoviePosterGridProps) {
  if (movies.length === 0) {
    return (
      <div className="glass flex flex-col items-center gap-3 rounded-3xl p-12 text-center text-muted-foreground">
        <Film className="size-8 text-amber" aria-hidden="true" />
        No projects yet.
      </div>
    );
  }

  return (
    <Stagger className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {movies.map((movie) => (
        <StaggerItem key={movie.id} className="h-full">
          <TiltCard className="group/poster h-full rounded-3xl">
            <article className="glass flex h-full flex-col overflow-hidden rounded-3xl transition-shadow duration-500 group-hover/poster:border-amber/40 group-hover/poster:shadow-[0_0_0_1px_rgb(242_165_65/0.35),0_24px_60px_-18px_rgb(242_165_65/0.45)]">
              <PosterArt movie={movie} />
              <div className="flex flex-1 flex-col gap-3 p-5">
                <h2 className="text-xl font-semibold text-white">{movie.title}</h2>
                <p className="line-clamp-3 flex-1 text-sm text-muted-foreground">
                  {movie.description || "No description yet."}
                </p>
                <Link href={hrefFor(movie.id)} className={buttonVariants({ className: "mt-2 h-10 w-full" })}>
                  {ctaLabel}
                </Link>
              </div>
            </article>
          </TiltCard>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
