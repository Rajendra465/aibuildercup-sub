import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  AudioLines,
  Baby,
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
  Tv,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { FadeIn, Stagger, StaggerItem, TiltCard } from "@/components/fx/motion";
import { HeroShowcase } from "@/components/three/hero-showcase";
import { cn } from "@/lib/utils";

interface Step {
  title: string;
  detail: string;
  icon: LucideIcon;
}

interface Feature {
  title: string;
  detail: string;
  icon: LucideIcon;
}

const STEPS: readonly Step[] = [
  { title: "Scout", detail: "Gemini watches the film and finds billboards, screens and props that can carry a brand.", icon: ScanSearch },
  { title: "Brief", detail: "Brands upload a logo, product shot, markets, season and the scenes to avoid.", icon: Megaphone },
  { title: "Match", detail: "Every viewer gets the best brand-safe campaign for their city, language and plan.", icon: Sparkles },
  { title: "Render", detail: "Gemini Omni paints the product into the shot, keeping the camera, light and story.", icon: Clapperboard },
  { title: "Validate", detail: "Each cut is scored for exposure and checked against the director rules.", icon: Gauge },
  { title: "Play", detail: "The cut streams seamlessly. Pause it, scan the QR, and shop what is on screen.", icon: Play },
];

const FEATURES: readonly Feature[] = [
  { title: "Slot Scout", detail: "AI scans the film and proposes placement surfaces with scores.", icon: ScanSearch },
  { title: "Brand Brief", detail: "Self-serve campaigns with assets, targeting, flight dates and bid weight.", icon: Megaphone },
  { title: "Brand Safety", detail: "Scene mood is matched against every brand avoid-list and director rule.", icon: ShieldCheck },
  { title: "Shoppable Pause", detail: "Pause the film to see the product, a call-to-action and a QR code.", icon: MousePointerClick },
  { title: "Exposure Score", detail: "Frame share, visible seconds and legibility rolled into one 0 to 100 score.", icon: Gauge },
  { title: "Brand Dashboard", detail: "Impressions, pause views, clicks and city breakdowns, live.", icon: BarChart3 },
  { title: "Seasonal re-versioning", detail: "Flight dates and seasons swap the creative automatically. No reshoot.", icon: CalendarClock },
  { title: "Kids and ad-free modes", detail: "Public-service messages for kids, neutral art for ad-free plans.", icon: Baby },
  { title: "Audio ads", detail: "An optional voice line mixed right into the scene.", icon: AudioLines },
];

const STUDIOS = [
  { href: "/director", title: "Director Studio", detail: "Scout surfaces, set the rules, approve every cut.", icon: Clapperboard },
  { href: "/brands", title: "Brand Studio", detail: "Brief once. Reach every market in its own language.", icon: Store },
  { href: "/watch", title: "Viewer", detail: "Watch your personalised cut. Pause to shop.", icon: Tv },
] as const;

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      <section className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pt-16 text-center sm:px-6 sm:pt-24">
        <FadeIn>
          <span className="glass mb-7 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-amber">
            <Sparkles className="size-3.5" aria-hidden="true" />
            AI in-scene product placement · Built with Gemini on Google Cloud
          </span>
        </FadeIn>
        <FadeIn delay={0.08}>
          <h1 className="text-5xl font-bold tracking-tight text-white sm:text-7xl md:text-8xl">
            The ad is <span className="text-gradient">in the scene.</span>
          </h1>
        </FadeIn>
        <FadeIn delay={0.16}>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            No ad breaks. InScene paints brand-safe, shoppable products straight into the film, a different placement
            for every viewer, with the director always in control.
          </p>
        </FadeIn>
        <FadeIn delay={0.24} className="mt-10 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Link href="/watch" className={cn(buttonVariants({ size: "lg" }), "h-12 px-7 text-base")}>
            <Play aria-hidden="true" />
            Watch a personalised cut
          </Link>
          <Link href="/director" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "h-12 px-7 text-base")}>
            <Clapperboard aria-hidden="true" />
            Director Studio
          </Link>
          <Link href="/brands" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "h-12 px-7 text-base")}>
            <Store aria-hidden="true" />
            Brand Studio
          </Link>
        </FadeIn>

        <FadeIn delay={0.3} className="mt-10 w-full">
          <HeroShowcase />
          <p className="mt-3 text-xs text-muted-foreground">One scene, five viewers. Every billboard version is a real Gemini edit.</p>
        </FadeIn>
      </section>

      <section aria-labelledby="how-heading" className="relative mx-auto max-w-6xl px-4 pt-24 sm:px-6">
        <FadeIn className="mb-10 text-center">
          <p className="text-xs font-semibold tracking-[0.3em] text-amber uppercase">How it works</p>
          <h2 id="how-heading" className="mt-3 text-3xl font-bold text-white sm:text-5xl">
            From raw film to a shoppable scene
          </h2>
        </FadeIn>
        <Stagger className="relative grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map(({ title, detail, icon: Icon }, index) => (
            <StaggerItem key={title}>
              <div className="glass group relative h-full rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-amber/30">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber/25 to-violet/25 ring-1 ring-white/10">
                    <Icon className="size-5 text-amber" aria-hidden="true" />
                  </span>
                  <span className="font-display text-sm font-semibold tracking-widest text-muted-foreground">
                    STEP {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{detail}</p>
                <div className="absolute inset-x-6 bottom-0 h-px origin-left scale-x-0 bg-gradient-to-r from-amber to-violet transition-transform duration-500 group-hover:scale-x-100" />
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section aria-labelledby="features-heading" className="relative mx-auto max-w-6xl px-4 pt-24 sm:px-6">
        <FadeIn className="mb-10 text-center">
          <p className="text-xs font-semibold tracking-[0.3em] text-amber uppercase">Features</p>
          <h2 id="features-heading" className="mt-3 text-3xl font-bold text-white sm:text-5xl">
            Everything a scene-native ad needs
          </h2>
        </FadeIn>
        <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" gap={0.05}>
          {FEATURES.map(({ title, detail, icon: Icon }) => (
            <StaggerItem key={title}>
              <TiltCard className="glass h-full rounded-2xl p-6">
                <Icon className="size-6 text-amber" aria-hidden="true" />
                <h3 className="mt-4 text-lg font-bold text-white">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{detail}</p>
              </TiltCard>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section aria-labelledby="studios-heading" className="relative mx-auto max-w-6xl px-4 pt-24 sm:px-6">
        <FadeIn className="mb-10 text-center">
          <p className="text-xs font-semibold tracking-[0.3em] text-amber uppercase">Three studios, one scene</p>
          <h2 id="studios-heading" className="mt-3 text-3xl font-bold text-white sm:text-5xl">Pick your seat</h2>
        </FadeIn>
        <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {STUDIOS.map(({ href, title, detail, icon: Icon }) => (
            <StaggerItem key={href}>
              <Link href={href} className="group block h-full">
                <TiltCard className="glass-strong relative h-full overflow-hidden rounded-3xl p-8">
                  <div className="absolute -top-16 -right-16 size-48 rounded-full bg-amber/20 opacity-50 blur-3xl transition-opacity group-hover:opacity-100" />
                  <Icon className="size-8 text-amber" aria-hidden="true" />
                  <h3 className="mt-6 text-2xl font-bold text-white">{title}</h3>
                  <p className="mt-2 text-muted-foreground">{detail}</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-amber">
                    Open
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </TiltCard>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <FadeIn>
          <div className="glass-strong relative overflow-hidden rounded-3xl px-8 py-14 text-center">
            <div className="absolute inset-0 bg-gradient-to-r from-amber/15 via-violet/15 to-azure/15" />
            <h2 className="relative text-3xl font-bold text-white sm:text-5xl">
              No ad breaks. <span className="text-gradient">Just a better scene.</span>
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-muted-foreground">
              Pick a viewer, press play, and watch the billboard change for them.
            </p>
            <Link href="/watch" className={cn(buttonVariants({ size: "lg" }), "relative mt-8 h-12 px-8 text-base")}>
              <Play aria-hidden="true" />
              Start watching
            </Link>
          </div>
        </FadeIn>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-muted-foreground">
        InScene · Team Berkians · AI Builder Cup 2026 · Built with Gemini on Google Cloud
      </footer>
    </main>
  );
}
