import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  AudioLines,
  BarChart3,
  CalendarClock,
  Clapperboard,
  Gauge,
  Megaphone,
  MousePointerClick,
  Play,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Store,
  Baby,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Step {
  title: string;
  detail: string;
}

interface Feature {
  title: string;
  detail: string;
  icon: LucideIcon;
}

const STEPS: readonly Step[] = [
  { title: "Scout", detail: "Gemini finds billboards, screens and props that can carry a brand." },
  { title: "Brief", detail: "Brands upload logo, product shot, targeting and flight dates." },
  { title: "Match", detail: "Each viewer gets the best brand-safe campaign for their city and season." },
  { title: "Render", detail: "Gemini Omni edits the product into the shot, keeping camera and light." },
  { title: "Validate", detail: "Every cut is checked for facts, prominence caps and exposure." },
  { title: "Play", detail: "The cut streams seamlessly — pause it to shop what's on screen." },
];

const FEATURES: readonly Feature[] = [
  { title: "Slot Scout", detail: "AI scans the film and proposes placement surfaces with scores.", icon: ScanSearch },
  { title: "Brand Brief", detail: "Self-serve campaigns with assets, targeting and bid weight.", icon: Megaphone },
  { title: "Brand Safety", detail: "Scene mood is matched against each brand's avoid-list and director rules.", icon: ShieldCheck },
  { title: "Shoppable Pause", detail: "Pause the film to see the product and a call-to-action.", icon: MousePointerClick },
  { title: "Exposure Score", detail: "Frame share, visible seconds and legibility in one 0–100 score.", icon: Gauge },
  { title: "Brand Dashboard", detail: "Impressions, pause views, clicks and city breakdowns live.", icon: BarChart3 },
  { title: "Seasonal re-versioning", detail: "Flight dates and season labels swap creative automatically.", icon: CalendarClock },
  { title: "Ad-free / kids mode", detail: "Neutral art or public-service messages for viewers who opt out.", icon: Baby },
  { title: "Audio ads", detail: "Optional diegetic voice line read inside the scene.", icon: AudioLines },
];

const AMBER_BUTTON = "bg-[#F2A541] text-black hover:bg-[#e0922c]";

export default function Home() {
  return (
    <main className="relative overflow-hidden bg-zinc-950 text-slate-50">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-24 left-1/2 h-[420px] w-[min(800px,100%)] -translate-x-1/2 rounded-full bg-[#F2A541]/10 blur-[140px]"
      />

      <section className="relative mx-auto flex max-w-4xl flex-col items-center px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-28">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#F2A541]/30 bg-[#F2A541]/10 px-3 py-1 text-xs font-medium text-[#F2A541]">
          <Sparkles className="size-3.5" aria-hidden="true" />
          InScene · AI in-scene product placement
        </span>
        <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl">
          The ad is in <span className="text-[#F2A541]">the scene.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-slate-300 sm:text-xl">
          InScene renders brand-safe, shoppable products straight into the film — a different placement for every
          viewer, with the director always in control.
        </p>

        <div className="mt-10 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Link
            href="/director"
            className={cn(buttonVariants({ size: "lg" }), "h-11 px-6 text-base font-semibold", AMBER_BUTTON)}
          >
            <Clapperboard aria-hidden="true" />
            Director Studio
          </Link>
          <Link
            href="/brands"
            className={cn(buttonVariants({ size: "lg", variant: "secondary" }), "h-11 px-6 text-base font-semibold")}
          >
            <Store aria-hidden="true" />
            Brand Studio
          </Link>
          <Link
            href="/watch"
            className={cn(buttonVariants({ size: "lg", variant: "outline" }), "h-11 px-6 text-base font-semibold")}
          >
            <Play aria-hidden="true" />
            Watch a cut
          </Link>
        </div>
      </section>

      <section aria-labelledby="how-heading" className="relative mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <h2 id="how-heading" className="mb-6 text-center text-sm font-semibold tracking-widest text-slate-400 uppercase">
          How it works
        </h2>
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {STEPS.map((step, index) => (
            <li key={step.title} className="relative rounded-xl border border-white/10 bg-zinc-900/60 p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-[#F2A541] text-xs font-bold text-black">
                  {index + 1}
                </span>
                <span className="font-semibold text-white">{step.title}</span>
                {index < STEPS.length - 1 && (
                  <ArrowRight className="ml-auto hidden size-4 text-[#F2A541]/60 lg:block" aria-hidden="true" />
                )}
              </div>
              <p className="text-sm leading-snug text-slate-400">{step.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="features-heading" className="relative mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <h2 id="features-heading" className="mb-6 text-center text-sm font-semibold tracking-widest text-slate-400 uppercase">
          Features
        </h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ title, detail, icon: Icon }) => (
            <li key={title} className="flex gap-3 rounded-xl border border-white/10 bg-zinc-900/40 p-4">
              <Icon className="mt-0.5 size-5 shrink-0 text-[#F2A541]" aria-hidden="true" />
              <div>
                <h3 className="font-semibold text-white">{title}</h3>
                <p className="mt-1 text-sm text-slate-400">{detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
