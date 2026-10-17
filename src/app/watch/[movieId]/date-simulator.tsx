"use client";

import { ChangeEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, RotateCcw } from "lucide-react";

interface DateSimulatorProps {
  date: string | null;
  seasonLabels: string[];
}

/** "Simulate date" picker: rewrites ?date= on the current URL, keeping other params (e.g. profile). */
export function DateSimulator({ date, seasonLabels }: DateSimulatorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const applyDate = (nextDate: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextDate) params.set("date", nextDate);
    else params.delete("date");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    applyDate(event.target.value || null);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <label className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-muted-foreground transition-colors focus-within:border-amber/50 focus-within:ring-3 focus-within:ring-amber/20 hover:border-white/25">
        <CalendarDays className="size-3.5 text-amber" aria-hidden="true" />
        <span className="font-medium text-white/80">Simulate date</span>
        <input
          type="date"
          value={date ?? ""}
          onChange={handleChange}
          className="rounded-md bg-transparent text-white outline-none [color-scheme:dark]"
        />
      </label>
      <AnimatePresence initial={false}>
        {date && (
          <motion.button
            key="reset-date"
            type="button"
            onClick={() => applyDate(null)}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-muted-foreground transition-colors hover:bg-white/5 hover:text-white focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            Reset to today
          </motion.button>
        )}
      </AnimatePresence>
      {seasonLabels.map((label) => (
        <motion.span
          key={label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-full border border-amber/40 bg-amber/10 px-3 py-1 font-medium text-amber shadow-[0_0_20px_-6px_rgb(242_165_65/0.6)]"
        >
          {label}
        </motion.span>
      ))}
    </div>
  );
}
