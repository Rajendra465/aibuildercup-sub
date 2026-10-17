"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SectionTone = "amber" | "violet" | "azure" | "mint";

const TONE_CHIP: Record<SectionTone, string> = {
  amber: "bg-amber/10 text-amber ring-amber/30",
  violet: "bg-violet/15 text-violet-200 ring-violet/35",
  azure: "bg-azure/15 text-blue-200 ring-azure/35",
  mint: "bg-mint/10 text-mint ring-mint/30",
};

interface InspectorSectionProps {
  /** Unique id; used for the heading id and the collapsible body id. */
  id: string;
  title: string;
  icon: LucideIcon;
  tone?: SectionTone;
  /** Small inline element after the title, e.g. a count. */
  meta?: ReactNode;
  /** Controls rendered beside the toggle (outside the toggle button). */
  actions?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

/** Collapsible inspector section with an animated body. */
export function InspectorSection({
  id,
  title,
  icon: Icon,
  tone = "amber",
  meta,
  actions,
  defaultOpen = true,
  children,
}: InspectorSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const reduceMotion = useReducedMotion();
  const headingId = `${id}-heading`;
  const bodyId = `${id}-body`;

  return (
    <section aria-labelledby={headingId} className="border-b border-white/[0.08] last:border-b-0">
      <div className="flex items-center gap-2 px-4 py-3 sm:px-5">
        <h3 id={headingId} className="min-w-0 flex-1 text-sm">
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls={bodyId}
            onClick={() => setIsOpen((open) => !open)}
            className="group flex w-full items-center gap-2.5 rounded-lg py-0.5 text-left font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-amber/60"
          >
            <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg ring-1", TONE_CHIP[tone])}>
              <Icon className="size-3.5" aria-hidden />
            </span>
            <span className="truncate">{title}</span>
            {meta}
            <ChevronDown
              className={cn(
                "ml-auto size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:text-white",
                isOpen && "rotate-180",
              )}
              aria-hidden
            />
          </button>
        </h3>
        {actions}
      </div>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="body"
            id={bodyId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-5 sm:px-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
