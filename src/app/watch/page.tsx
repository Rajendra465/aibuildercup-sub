import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { allMovies } from "@/lib/data/studio-store";
import { PageHeader } from "@/components/fx/motion";
import { MoviePosterGrid } from "./movie-poster-grid";

function watchHref(movieId: string): string {
  return `/watch/${movieId}`;
}

export default function WatchIndexPage() {
  const movies = allMovies();

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 rounded-lg text-sm text-muted-foreground transition-colors hover:text-white focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Home
      </Link>
      <PageHeader
        kicker="Now streaming"
        title={
          <>
            Watch a <span className="text-gradient">personalized cut</span>
          </>
        }
        lede="Choose a project, then pick a viewer profile. Every profile gets its own scene-aware placements."
      />
      <MoviePosterGrid movies={movies} hrefFor={watchHref} ctaLabel="Choose profile" />
    </main>
  );
}
