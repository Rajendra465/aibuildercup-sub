"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
    <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/85 backdrop-blur supports-backdrop-filter:bg-zinc-950/70">
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6"
      >
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight text-white">
          <Clapperboard className="size-5 text-[#F2A541]" aria-hidden="true" />
          <span>
            In<span className="text-[#F2A541]">Scene</span>
          </span>
        </Link>
        <ul className="-mx-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1 text-sm [scrollbar-width:none]">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === current;
            return (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "block rounded-md px-2.5 py-1.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#F2A541]/60",
                    isActive
                      ? "bg-[#F2A541]/15 text-[#F2A541]"
                      : "text-slate-300 hover:bg-white/5 hover:text-white",
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
