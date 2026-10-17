import { cn } from "@/lib/utils";

/** Decorative skeleton block; pair it with visually hidden text for screen readers. */
export function Shimmer({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("rounded-lg bg-white/[0.06] shimmer-bg animate-shimmer", className)} />;
}
