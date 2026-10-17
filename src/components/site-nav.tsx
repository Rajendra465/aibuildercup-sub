"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/director", label: "Director Studio" },
  { href: "/brands", label: "Brand Studio" },
  { href: "/watch", label: "Watch" },
  { href: "/compare", label: "Compare" },
  { href: "/brands/dashboard", label: "Dashboard" },
  { href: "/jobs", label: "Jobs" },
];

/** Picks the single nav item that best matches the current path (longest prefix wins). */
function activeHref(pathname: string): string | undefined {
  const matches = NAV_ITEMS.filter((item) =>
    item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return matches.sort((left, right) => right.href.length - left.href.length)[0]?.href;
}

export function SiteNav() {
  const pathname = usePathname() ?? "/";
  const current = activeHref(pathname);

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-6">
      <nav
        aria-label="Primary"
        className="glass-strong mx-auto flex max-w-7xl items-center gap-4 rounded-2xl px-3 py-2 sm:px-4"
      >
        <Link href="/" className="group flex shrink-0 items-center gap-2 font-display text-lg font-bold tracking-tight text-white">
          <span className="relative flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber to-violet shadow-[0_0_24px_rgb(242_165_65/0.45)] transition-transform group-hover:rotate-6">
            <Clapperboard className="size-4 text-ink" aria-hidden="true" />
          </span>
          <span>
            In<span className="text-gradient">Scene</span>
          </span>
        </Link>
        <ul className="-mx-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1 text-sm [scrollbar-width:none]">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === current;
            return (
              <li key={item.href} className="relative shrink-0">
                {isActive && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-xl bg-amber/15 ring-1 ring-amber/40"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative block rounded-xl px-3 py-1.5 font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-amber/60",
                    isActive ? "text-amber" : "text-slate-300 hover:text-white",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
