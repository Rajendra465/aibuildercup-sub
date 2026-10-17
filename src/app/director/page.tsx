import Link from "next/link";
import { ArrowLeft, ArrowRight, Clapperboard, Clock, Film, MousePointerClick, ShieldCheck, UploadCloud } from "lucide-react";
import type { Movie } from "@/lib/types";
import { allMovies } from "@/lib/data/studio-store";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader, Stagger, StaggerItem, TiltCard } from "@/components/fx/motion";
import { cn } from "@/lib/utils";
import { ProjectCreateForm } from "./project-create-form";
import { MotionRoot, Reveal } from "./director-motion";

const STATUS_CHIP: Record<Movie["status"], { label: string; className: string; dot: string }> = {
  ready: { label: "Ready", className: "border-mint/40 bg-mint/10 text-mint", dot: "bg-mint" },
  draft: { label: "Draft", className: "border-amber/40 bg-amber/10 text-amber", dot: "bg-amber" },
  archived: { label: "Archived", className: "border-white/15 bg-white/[0.05] text-muted-foreground", dot: "bg-zinc-500" },
};

const STEPS = [
  { icon: UploadCloud, title: "Upload the cut", text: "Your canonical film is the source of truth." },
  { icon: MousePointerClick, title: "Mark the surfaces", text: "Add segments by hand or let Slot Scout find them." },
  { icon: ShieldCheck, title: "Approve every cut", text: "Set brand-safety rules; nothing plays without you." },
] as const;

function formatDuration(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export default function DirectorIndexPage() {
  const movies = allMovies();

  return (
    <MotionRoot>
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-amber/60"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to Home
      </Link>

      <PageHeader
        kicker="InScene · For filmmakers"
        title={
          <>
            Director <span className="text-gradient">Studio</span>
          </>
        }
        lede="Mark the surfaces in your film where a brand may appear, set the rules, and approve every cut. You stay in control."
      />

      <Reveal delay={0.1} className="mb-14">
        <section aria-labelledby="new-project-heading" className="glass-strong relative overflow-hidden rounded-3xl">
          <div aria-hidden="true" className="pointer-events-none absolute -top-32 -left-20 size-80 rounded-full bg-amber/15 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -bottom-32 size-80 rounded-full bg-violet/20 blur-3xl" />
          <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12">
            <div>
              <span className="mb-4 grid size-11 place-items-center rounded-xl bg-amber/10 text-amber ring-1 ring-amber/30">
                <Clapperboard className="size-5" aria-hidden />
              </span>
              <h2 id="new-project-heading" className="text-2xl font-semibold text-white">New Project</h2>
              <p className="mt-2 text-sm text-muted-foreground">Upload a canonical video, then mark adaptive segments in the editor.</p>
              <ol className="mt-6 space-y-4">
                {STEPS.map((step, index) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.05] font-mono text-xs text-amber">
                      {index + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5 text-sm font-medium text-white">
                        <step.icon className="size-3.5 text-muted-foreground" aria-hidden />
                        {step.title}
                      </div>
                      <p className="text-xs text-muted-foreground">{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <ProjectCreateForm />
          </div>
        </section>
      </Reveal>

      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[0.3em] text-amber uppercase">Library</p>
          <h2 className="text-2xl font-semibold text-white">Your projects</h2>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {movies.length} {movies.length === 1 ? "project" : "projects"}
        </span>
      </div>

      {movies.length === 0 ? (
        <div className="glass grid place-items-center gap-2 rounded-3xl border-dashed p-12 text-center text-muted-foreground">
          <Film className="size-6 opacity-60" aria-hidden />
          No projects yet. Create one above to open the editor.
        </div>
      ) : (
        <Stagger className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {movies.map((movie) => (
            <StaggerItem key={movie.id}>
              <MovieTile movie={movie} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </main>
    </MotionRoot>
  );
}

function MovieTile({ movie }: { movie: Movie }) {
  const status = STATUS_CHIP[movie.status] ?? STATUS_CHIP.draft;
  return (
    <TiltCard className="h-full rounded-3xl" max={6}>
      <article className="glass flex h-full flex-col overflow-hidden rounded-3xl">
        <div
          className="relative aspect-video overflow-hidden bg-night bg-cover bg-center"
          style={movie.posterUrl ? { backgroundImage: `url(${JSON.stringify(movie.posterUrl)})` } : undefined}
        >
          {!movie.posterUrl && (
            <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(70%_80%_at_20%_20%,rgb(242_165_65/0.35),transparent_60%),radial-gradient(60%_80%_at_85%_80%,rgb(139_92_246/0.4),transparent_60%)]">
              <Film className="absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-1/2 text-white/30" />
            </div>
          )}
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/70 to-transparent" />
          <span
            className={cn(
              "absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-md",
              status.className,
            )}
          >
            <span className={cn("size-1.5 rounded-full", status.dot)} aria-hidden="true" />
            {status.label}
          </span>
          <span className="absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 font-mono text-[11px] text-white backdrop-blur-md">
            <Clock className="size-3" aria-hidden />
            {formatDuration(movie.durationSeconds)}
          </span>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <h3 className="text-lg font-semibold text-white">{movie.title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Duration: {movie.durationSeconds}s · {movie.status}
          </p>
          <p className="mt-3 mb-5 line-clamp-3 flex-1 text-sm text-slate-300">{movie.description || "No description yet."}</p>
          <Link href={`/director/movies/${movie.id}`} className={buttonVariants({ className: "group/open h-10 w-full" })}>
            Open Project
            <ArrowRight className="size-4 transition-transform group-hover/open:translate-x-0.5" aria-hidden />
          </Link>
        </div>
      </article>
    </TiltCard>
  );
}
