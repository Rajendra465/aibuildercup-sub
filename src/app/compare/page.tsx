import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { allMovies } from "@/lib/data/studio-store";
import { PageHeader } from "@/components/fx/motion";
import { MoviePosterGrid } from "@/app/watch/movie-poster-grid";

function compareHref(movieId: string): string {
  return `/compare/${movieId}`;
}

export default function CompareIndexPage() {
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
        kicker="Side by side"
        title={
          <>
            Compare <span className="text-gradient">personalized cuts</span>
          </>
        }
        lede="Pick a project to play several viewer cuts in sync and see how each scene adapts."
      />
      <MoviePosterGrid movies={movies} hrefFor={compareHref} ctaLabel="Compare this project" />
    </main>
  );
}
